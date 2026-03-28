import mongoose from 'mongoose';
import Consent from '../models/consent.model.js';
import User from '../models/user.model.js';
import * as patientService from './patient.service.js';
import * as blockchainService from './blockchain.service.js';
import { AppError } from '../middleware/errorHandler.js';
import AuditLog from '../models/auditLog.model.js';

const populateConsentForResponse = async (id) =>
  Consent.findById(id)
    .populate({
      path: 'patientId',
      populate: { path: 'userId', select: 'firstName lastName email' },
    })
    .populate('grantedTo.userId', 'firstName lastName email role')
    .populate('grantedTo.clinicId', 'name clinicCode')
    .populate('grantedBy', 'firstName lastName')
    .exec();

/**
 * Grant consent to a doctor or clinic
 */
export const grantConsent = async (consentData, patientUserId) => {
  const { grantedToUserId, clinicId, accessLevel, scope, expiresAt } = consentData;

  const granteeId = new mongoose.Types.ObjectId(String(grantedToUserId));

  const doctorUser = await User.findById(granteeId).select('role clinicId');
  if (!doctorUser || doctorUser.role !== 'doctor') {
    throw new AppError('You can only grant consent to a registered doctor account', 400);
  }

  const resolvedClinicId = clinicId || doctorUser.clinicId || undefined;

  // 1. Resolve patient profile (create minimal one for legacy users missing Patient doc)
  const patient = await patientService.ensurePatientProfile(patientUserId);

  // 2. Check if already granted
  const existingConsent = await Consent.findOne({
    patientId: patient._id,
    'grantedTo.userId': granteeId,
    status: 'active',
  });

  if (existingConsent) {
    throw new AppError('Consent already granted to this user', 400);
  }

  // 3. Generate MongoDB ID first so we can use it on the blockchain
  const consentToSave = new Consent({
    patientId: patient._id,
    grantedTo: {
      userId: granteeId,
      clinicId: resolvedClinicId,
    },
    accessLevel,
    scope,
    expiresAt: expiresAt ? new Date(expiresAt) : undefined,
    grantedBy: patientUserId,
  });

  // 4. Grant on Blockchain (never block saving consent if chain/wallet is misconfigured)
  let blockchainResult = null;
  try {
    blockchainResult = await blockchainService.grantConsentOnChain(
      consentToSave._id.toString(),
      patient._id.toString(),
      granteeId.toString(),
      accessLevel
    );
  } catch (err) {
    console.error('Consent blockchain step failed; persisting consent in database only:', err?.message || err);
  }

  consentToSave.blockchainTxHash = blockchainResult?.transactionHash || null;
  const consent = await consentToSave.save();

  // 5. Audit Log
  await AuditLog.createLog({
    action: 'consent_granted',
    userId: patientUserId,
    targetResource: {
      resourceType: 'Consent',
      resourceId: consent._id,
    },
    details: {
      grantedTo: granteeId,
      accessLevel,
    },
    blockchainTxHash: blockchainResult?.transactionHash,
  });

  return await populateConsentForResponse(consent._id);
};

/**
 * Revoke consent
 */
export const revokeConsent = async (consentId, userId) => {
  const consent = await Consent.findById(consentId);
  if (!consent) {
    throw new AppError('Consent record not found', 404);
  }

  // Verify ownership (only patient themselves or admin can revoke)
  // This check usually happens in the route, but safe to double check

  // 1. Revoke on Blockchain (do not block DB revoke if chain fails)
  let blockchainResult = null;
  try {
    blockchainResult = await blockchainService.revokeConsentOnChain(consentId);
  } catch (err) {
    console.error('Consent revoke blockchain step failed; updating database only:', err?.message || err);
  }

  // 2. Update MongoDB
  await consent.revoke(userId, 'Revoked by user');
  if (blockchainResult?.transactionHash) {
    consent.blockchainTxHash = blockchainResult.transactionHash;
  }
  await consent.save();

  // 3. Audit Log
  await AuditLog.createLog({
    action: 'consent_revoked',
    userId,
    targetResource: {
      resourceType: 'Consent',
      resourceId: consent._id,
    },
    blockchainTxHash: blockchainResult?.transactionHash,
  });

  return consent;
};

/**
 * Check if a doctor has consent for a patient
 */
export const checkAccessConsent = async (patientId, doctorId) => {
  // 1. Check MongoDB first for active consent
  const consent = await Consent.findOne({
    patientId,
    'grantedTo.userId': doctorId,
    status: 'active',
  });

  if (!consent) {
    return false;
  }

  // 2. Check blockchain as fallback/verification if valid function exists and returns false
  if (typeof consent.isValid === 'function' && !consent.isValid()) {
    try {
      const onChainResult = await blockchainService.checkConsentOnChain(consent._id.toString());
      return onChainResult.hasConsent;
    } catch (err) {
      return false;
    }
  }

  return true;
};

/**
 * Get all consents for a user (patient, doctor, or admin)
 */
export const getPatientConsents = async (user) => {
  const populateChain = (query) =>
    query
      .populate({
        path: 'patientId',
        populate: { path: 'userId', select: 'firstName lastName email' },
      })
      .populate('grantedTo.userId', 'firstName lastName email role')
      .populate('grantedTo.clinicId', 'name clinicCode')
      .populate('grantedBy', 'firstName lastName')
      .sort({ createdAt: -1 });

  if (user.role === 'admin') {
    return await populateChain(Consent.find());
  } else if (user.role === 'doctor') {
    const doctorUserId = mongoose.Types.ObjectId.isValid(user._id)
      ? new mongoose.Types.ObjectId(String(user._id))
      : user._id;
    return await populateChain(
      Consent.find({ 'grantedTo.userId': doctorUserId })
    );
  } else {
    const patient = await patientService.ensurePatientProfile(user._id);
    return await populateChain(Consent.find({ patientId: patient._id }));
  }
};
