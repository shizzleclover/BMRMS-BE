import express from 'express';
import * as authService from '../services/auth.service.js';
import { protect } from '../middleware/auth.js';
import { validate, commonSchemas } from '../middleware/validate.js';
import { z } from 'zod';

const router = express.Router();

// Validation schemas
const registerSchema = z.object({
  body: z.object({
    firstName: z.string().min(1, 'First name is required'),
    lastName: z.string().min(1, 'Last name is required'),
    email: commonSchemas.email,
    password: commonSchemas.password,
    role: z.enum(['admin', 'doctor', 'patient']).default('patient'),
    phone: commonSchemas.phone.optional(),
    dateOfBirth: z.string().optional(),
    gender: z.enum(['male', 'female', 'other']).optional(),
  }),
});

const loginSchema = z.object({
  body: z.object({
    email: commonSchemas.email,
    password: z.string().min(1, 'Password is required'),
  }),
});

const refreshTokenSchema = z.object({
  body: z.object({
    refreshToken: z.string().min(1, 'Refresh token is required'),
  }),
});

const changePasswordSchema = z.object({
  body: z.object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: commonSchemas.password,
  }),
});

// Routes
router.post('/register', validate(registerSchema), async (req, res, next) => {
  try {
    const result = await authService.register(
      req.body,
      req.ip,
      req.get('user-agent')
    );

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: result,
    });
  } catch (error) {
    next(error);
  }
});

router.post('/login', validate(loginSchema), async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const result = await authService.login(
      email,
      password,
      req.ip,
      req.get('user-agent')
    );

    res.json({
      success: true,
      message: 'Login successful',
      data: result,
    });
  } catch (error) {
    next(error);
  }
});

router.post('/refresh', validate(refreshTokenSchema), async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    const result = await authService.refreshAccessToken(refreshToken);

    res.json({
      success: true,
      message: 'Token refreshed successfully',
      data: result,
    });
  } catch (error) {
    next(error);
  }
});

router.post('/logout', protect, async (req, res, next) => {
  try {
    const result = await authService.logout(
      req.user._id,
      req.ip,
      req.get('user-agent')
    );

    res.json({
      success: true,
      message: 'Logout successful',
      data: result,
    });
  } catch (error) {
    next(error);
  }
});

router.get('/profile', protect, async (req, res, next) => {
  try {
    const user = await authService.getProfile(req.user._id);

    res.json({
      success: true,
      data: user,
    });
  } catch (error) {
    next(error);
  }
});

router.patch('/profile', protect, async (req, res, next) => {
  try {
    const user = await authService.updateProfile(req.user._id, req.body);

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: user,
    });
  } catch (error) {
    next(error);
  }
});

router.post('/change-password', protect, validate(changePasswordSchema), async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const result = await authService.changePassword(
      req.user._id,
      currentPassword,
      newPassword
    );

    res.json({
      success: true,
      message: result.message,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
