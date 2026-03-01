import Patient from '../models/patient.model.js';
import User from '../models/user.model.js';
import { AppError } from '../middleware/errorHandler.js';
import AuditLog from '../models/auditLog.model.js';

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
 */
export const getAllPatients = async (filters = {}, options = {}) => {
  const { page = 1, limit = 10 } = options;
  const skip = (page - 1) * limit;

  const query = { isActive: true, ...filters };

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
