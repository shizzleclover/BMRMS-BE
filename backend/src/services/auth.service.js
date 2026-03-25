import jwt from 'jsonwebtoken';
import config from '../config/index.js';
import User from '../models/user.model.js';
import { AppError } from '../middleware/errorHandler.js';
import AuditLog from '../models/auditLog.model.js';

/**
 * Generate JWT token
 */
const generateToken = (userId, secret, expiresIn) => {
  return jwt.sign({ id: userId }, secret, { expiresIn });
};

/**
 * Register a new user
 */
export const register = async (userData, ipAddress, userAgent) => {
  // Check if user already exists
  const existingUser = await User.findOne({ email: userData.email });
  if (existingUser) {
    throw new AppError('Email already registered', 400);
  }

  // Create user
  const user = await User.create(userData);

  // Generate tokens
  const accessToken = generateToken(user._id, config.jwt.secret, config.jwt.expiresIn);
  const refreshToken = generateToken(
    user._id,
    config.jwt.refreshSecret,
    config.jwt.refreshExpiresIn
  );

  // Save refresh token
  user.refreshToken = refreshToken;
  await user.save();

  // Create audit log
  await AuditLog.createLog({
    action: 'user_login',
    userId: user._id,
    ipAddress,
    userAgent,
    status: 'success',
  });

  return {
    user,
    accessToken,
    refreshToken,
  };
};

/**
 * Login user
 */
export const login = async (email, password, ipAddress, userAgent) => {
  const normalizedEmail = String(email || '').trim().toLowerCase();

  // Find user and include password
  const user = await User.findOne({ email: normalizedEmail }).select('+password');

  if (!user) {
    throw new AppError('Invalid email or password', 401);
  }

  // Check if user is active
  if (!user.isActive) {
    throw new AppError('Your account has been deactivated', 401);
  }

  // Verify password
  const isPasswordValid = await user.comparePassword(password);
  if (!isPasswordValid) {
    // Log failed attempt
    await AuditLog.createLog({
      action: 'user_login',
      userId: user._id,
      ipAddress,
      userAgent,
      status: 'failure',
      errorMessage: 'Invalid password',
    });

    throw new AppError('Invalid email or password', 401);
  }

  // Generate tokens
  const accessToken = generateToken(user._id, config.jwt.secret, config.jwt.expiresIn);
  const refreshToken = generateToken(
    user._id,
    config.jwt.refreshSecret,
    config.jwt.refreshExpiresIn
  );

  // Update user
  user.refreshToken = refreshToken;
  user.lastLogin = new Date();
  await user.save();

  // Create audit log
  await AuditLog.createLog({
    action: 'user_login',
    userId: user._id,
    ipAddress,
    userAgent,
    status: 'success',
  });

  // Remove password from response
  user.password = undefined;

  return {
    user,
    accessToken,
    refreshToken,
  };
};

/**
 * Refresh access token
 */
export const refreshAccessToken = async (refreshToken) => {
  try {
    // Verify refresh token
    const decoded = jwt.verify(refreshToken, config.jwt.refreshSecret);

    // Find user
    const user = await User.findById(decoded.id).select('+refreshToken');

    if (!user || user.refreshToken !== refreshToken) {
      throw new AppError('Invalid refresh token', 401);
    }

    // Generate new access token
    const accessToken = generateToken(user._id, config.jwt.secret, config.jwt.expiresIn);

    return { accessToken };
  } catch (error) {
    throw new AppError('Invalid refresh token', 401);
  }
};

/**
 * Logout user
 */
export const logout = async (userId, ipAddress, userAgent) => {
  const user = await User.findById(userId);

  if (user) {
    user.refreshToken = null;
    await user.save();

    // Create audit log
    await AuditLog.createLog({
      action: 'user_logout',
      userId: user._id,
      ipAddress,
      userAgent,
      status: 'success',
    });
  }

  return { message: 'Logged out successfully' };
};

/**
 * Get current user profile
 */
export const getProfile = async (userId) => {
  const user = await User.findById(userId)
    .populate('clinicId', 'name clinicCode')
    .populate('patientId');

  if (!user) {
    throw new AppError('User not found', 404);
  }

  return user;
};

/**
 * Update user profile
 */
export const updateProfile = async (userId, updateData) => {
  // Prevent updating sensitive fields
  delete updateData.password;
  delete updateData.role;
  delete updateData.email;
  delete updateData.refreshToken;

  const user = await User.findByIdAndUpdate(userId, updateData, {
    new: true,
    runValidators: true,
  });

  if (!user) {
    throw new AppError('User not found', 404);
  }

  return user;
};

/**
 * Change password
 */
export const changePassword = async (userId, currentPassword, newPassword) => {
  const user = await User.findById(userId).select('+password');

  if (!user) {
    throw new AppError('User not found', 404);
  }

  // Verify current password
  const isPasswordValid = await user.comparePassword(currentPassword);
  if (!isPasswordValid) {
    throw new AppError('Current password is incorrect', 401);
  }

  // Update password
  user.password = newPassword;
  await user.save();

  return { message: 'Password changed successfully' };
};
