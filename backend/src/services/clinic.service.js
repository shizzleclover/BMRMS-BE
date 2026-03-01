import Clinic from '../models/clinic.model.js';
import User from '../models/user.model.js';
import { AppError } from '../middleware/errorHandler.js';

/**
 * Create a new clinic
 */
export const createClinic = async (clinicData, adminId) => {
  const clinic = await Clinic.create({
    ...clinicData,
    adminId,
  });

  // Adding the creator as an admin in staff as well
  clinic.staff.push({
    userId: adminId,
    role: 'admin',
  });

  await clinic.save();

  // Update user with clinic reference
  await User.findByIdAndUpdate(adminId, { clinicId: clinic._id });

  return clinic;
};

/**
 * Get all clinics
 */
export const getAllClinics = async (filters = {}, options = {}) => {
  const { page = 1, limit = 10 } = options;
  const skip = (page - 1) * limit;

  const query = { isActive: true, ...filters };

  const clinics = await Clinic.find(query)
    .populate('adminId', 'firstName lastName email')
    .skip(skip)
    .limit(limit);

  const total = await Clinic.countDocuments(query);

  return {
    clinics,
    total,
    page,
    pages: Math.ceil(total / limit),
  };
};

/**
 * Get clinic by ID
 */
export const getClinicById = async (id) => {
  const clinic = await Clinic.findById(id).populate('staff.userId', 'firstName lastName email role');
  if (!clinic) {
    throw new AppError('Clinic not found', 404);
  }
  return clinic;
};

/**
 * Update clinic
 */
export const updateClinic = async (id, updateData) => {
  const clinic = await Clinic.findByIdAndUpdate(id, updateData, {
    new: true,
    runValidators: true,
  });

  if (!clinic) {
    throw new AppError('Clinic not found', 404);
  }

  return clinic;
};

/**
 * Add staff to clinic
 */
export const addStaff = async (clinicId, staffData) => {
  const { userId, role } = staffData;
  
  const clinic = await Clinic.findById(clinicId);
  if (!clinic) {
    throw new AppError('Clinic not found', 404);
  }

  // Check if user exists
  const user = await User.findById(userId);
  if (!user) {
    throw new AppError('User not found', 404);
  }

  // Check if already on staff
  const isOnStaff = clinic.staff.some((s) => s.userId.toString() === userId.toString());
  if (isOnStaff) {
    throw new AppError('User is already on the staff of this clinic', 400);
  }

  clinic.staff.push({ userId, role });
  await clinic.save();

  // Update user's clinicId if not set
  if (!user.clinicId) {
    user.clinicId = clinicId;
    await user.save();
  }

  return clinic;
};

/**
 * Remove staff from clinic
 */
export const removeStaff = async (clinicId, userId) => {
  const clinic = await Clinic.findById(clinicId);
  if (!clinic) {
    throw new AppError('Clinic not found', 404);
  }

  clinic.staff = clinic.staff.filter((s) => s.userId.toString() !== userId.toString());
  await clinic.save();

  // Optionally unset user's clinicId if it matches this clinic
  const user = await User.findById(userId);
  if (user && user.clinicId?.toString() === clinicId.toString()) {
    user.clinicId = undefined;
    await user.save();
  }

  return clinic;
};
