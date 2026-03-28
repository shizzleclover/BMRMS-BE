import mongoose from 'mongoose';
import Patient from '../models/patient.model.js';
import User from '../models/user.model.js';
import Consent from '../models/consent.model.js';
import { AppError } from '../middleware/errorHandler.js';
import AuditLog from '../models/auditLog.model.js';

/**
 * Return the Patient document for this user, creating a minimal profile if missing
 * (e.g. legacy accounts registered before auto-create Patient on signup).
 */
export const ensurePatientProfile = async (userId) => {
  let patient = await Patient.findOne({ userId });
  if (patient) return patient;

  const user = await User.findById(userId);
  if (!user) {
    throw new AppError('User not found', 404);
  }
  if (user.role !== 'patient') {
    throw new AppError('Only patient accounts have a patient profile', 403);
  }

  patient = await Patient.create({ userId });
  user.patientId = patient._id;
  await user.save();
  return patient;
};

/**
 * Create a new patient profile
 */
export const createPatient = async (patientData, userId) => {
  // Check if patient profile already exists for this user
  const existingPatient = await Patient.findOne({ userId });
  if (existingPatient) {
    throw new AppError('Patient profile already exists for this user', 400);
  }

  const patient = await Patient.create({
    ...patientData,
    userId,
  });

  // Update user with patient reference
  await User.findByIdAndUpdate(userId, { patientId: patient._id });

  return patient;
};

/**
 * Get all patients (with pagination and filtering)
 * @param {object} scope - For doctors: scope.doctorUserId returns patients in their clinic OR with
 *   an active, non-expired consent granted to that doctor (so the list matches who they may access).
 */
export const getAllPatients = async (filters = {}, options = {}, scope = {}) => {
  const { page = 1, limit = 10 } = options;
  const skip = (page - 1) * limit;

  const clinicId = scope.clinicId;
  const doctorUserId = scope.doctorUserId;

  const query = { isActive: true, ...filters };

  if (doctorUserId) {
    const docOid = mongoose.Types.ObjectId.isValid(doctorUserId)
      ? new mongoose.Types.ObjectId(String(doctorUserId))
      : doctorUserId;

    const consentPatientIds = await Consent.distinct('patientId', {
      'grantedTo.userId': docOid,
      status: 'active',
      $or: [
        { expiresAt: { $exists: false } },
        { expiresAt: null },
        { expiresAt: { $gt: new Date() } },
      ],
    });

    const orBranches = [];

    if (clinicId) {
      const cid = mongoose.Types.ObjectId.isValid(clinicId)
        ? new mongoose.Types.ObjectId(String(clinicId))
        : clinicId;
      orBranches.push(
        { primaryClinic: cid },
        { 'assignedClinics.clinicId': cid },
      );
    }

    if (consentPatientIds.length > 0) {
      orBranches.push({ _id: { $in: consentPatientIds } });
    }

    if (orBranches.length === 0) {
      return {
        patients: [],
        total: 0,
        page: Number(page) || 1,
        pages: 0,
      };
    }

    query.$or = orBranches;
  } else if (clinicId) {
    const cid = mongoose.Types.ObjectId.isValid(clinicId)
      ? new mongoose.Types.ObjectId(String(clinicId))
      : clinicId;
    query.$or = [
      { primaryClinic: cid },
      { 'assignedClinics.clinicId': cid },
    ];
  }

  const patients = await Patient.find(query)
    .populate('userId', 'firstName lastName email phone')
    .populate('primaryClinic', 'name clinicCode')
    .skip(skip)
    .limit(limit)
    .sort({ createdAt: -1 });

  const total = await Patient.countDocuments(query);

  return {
    patients,
    total,
    page,
    pages: Math.ceil(total / limit),
  };
};

/**
 * Get patient by ID
 */
export const getPatientById = async (id) => {
  const patient = await Patient.findById(id)
    .populate('userId', 'firstName lastName email phone dateOfBirth gender address')
    .populate('primaryClinic', 'name clinicCode address contact')
    .populate('assignedClinics.clinicId', 'name clinicCode');

  if (!patient) {
    throw new AppError('Patient not found', 404);
  }

  return patient;
};

/**
 * Update patient profile
 */
export const updatePatient = async (id, updateData) => {
  const patient = await Patient.findByIdAndUpdate(id, updateData, {
    new: true,
    runValidators: true,
  });

  if (!patient) {
    throw new AppError('Patient not found', 404);
  }

  return patient;
};

/**
 * Soft delete patient
 */
export const deletePatient = async (id) => {
  const patient = await Patient.findByIdAndUpdate(id, { isActive: false }, { new: true });

  if (!patient) {
    throw new AppError('Patient not found', 404);
  }

  // Also deactivate the associated user
  await User.findByIdAndUpdate(patient.userId, { isActive: false });

  return { message: 'Patient deactivated successfully' };
};

/**
 * Assign patient to a clinic
 */
export const assignToClinic = async (patientId, clinicId) => {
  const patient = await Patient.findById(patientId);
  if (!patient) {
    throw new AppError('Patient not found', 404);
  }

  // Check if already assigned
  const isAssigned = patient.assignedClinics.some(
    (c) => c.clinicId.toString() === clinicId.toString()
  );

  if (isAssigned) {
    throw new AppError('Patient already assigned to this clinic', 400);
  }

  patient.assignedClinics.push({ clinicId });
  
  // If no primary clinic, set this as primary
  if (!patient.primaryClinic) {
    patient.primaryClinic = clinicId;
  }

  await patient.save();
  return patient;
};
