import Consent from '../models/consent.model.js';
import Patient from '../models/patient.model.js';
import User from '../models/user.model.js';
import * as blockchainService from './blockchain.service.js';
import { AppError } from '../middleware/errorHandler.js';
import AuditLog from '../models/auditLog.model.js';

/**
 * Grant consent to a doctor or clinic
 */
export const grantConsent = async (consentData, patientUserId) => {
  const { grantedToUserId, clinicId, accessLevel, scope, expiresAt } = consentData;

  // 1. Get patient ID from user ID
  const patient = await Patient.findOne({ userId: patientUserId });
  if (!patient) {
    throw new AppError('Patient profile not found', 404);
  }

  // 2. Check if already granted
  const existingConsent = await Consent.findOne({
    patientId: patient._id,
    'grantedTo.userId': grantedToUserId,
    status: 'active',
  });

  if (existingConsent) {
    throw new AppError('Consent already granted to this user', 400);
  }

  // 3. Generate MongoDB ID first so we can use it on the blockchain
  const consentToSave = new Consent({
    patientId: patient._id,
    grantedTo: {
      userId: grantedToUserId,
      clinicId,
    },
    accessLevel,
    scope,
    expiresAt: expiresAt ? new Date(expiresAt) : undefined,
    grantedBy: patientUserId,
  });

  // 4. Grant on Blockchain
  const blockchainResult = await blockchainService.grantConsentOnChain(
    consentToSave._id.toString(),
    patient._id.toString(),
    grantedToUserId.toString(),
    accessLevel
  );

  // 5. Save to MongoDB with Tx Hash
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
      grantedTo: grantedToUserId,
      accessLevel,
    },
    blockchainTxHash: blockchainResult.transactionHash,
  });

  return consent;
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

  // 1. Revoke on Blockchain
  const blockchainResult = await blockchainService.revokeConsentOnChain(consentId);

  // 2. Update MongoDB
  await consent.revoke(userId, 'Revoked by user');
  consent.blockchainTxHash = blockchainResult.transactionHash;
  await consent.save();

  // 3. Audit Log
  await AuditLog.createLog({
    action: 'consent_revoked',
    userId,
    targetResource: {
      resourceType: 'Consent',
      resourceId: consent._id,
    },
    blockchainTxHash: blockchainResult.transactionHash,
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
 * Get all consents for a patient
 */
export const getPatientConsents = async (patientUserId) => {
  const patient = await Patient.findOne({ userId: patientUserId });
  if (!patient) throw new AppError('Patient not found', 404);

  return await Consent.find({ patientId: patient._id })
    .populate('grantedTo.userId', 'firstName lastName email role')
    .populate('grantedTo.clinicId', 'name clinicCode')
    .sort({ createdAt: -1 });
};
