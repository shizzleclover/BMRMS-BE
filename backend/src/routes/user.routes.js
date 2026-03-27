import express from 'express';
import User from '../models/user.model.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

/**
 * List active doctor accounts (for patient consent grant UI — pick by name, not raw ID).
 */
router.get('/doctors', protect, authorize('patient', 'admin'), async (req, res, next) => {
  try {
    const doctors = await User.find({ role: 'doctor', isActive: true })
      .select('_id firstName lastName email')
      .sort({ lastName: 1, firstName: 1 })
      .lean();

    res.json({
      success: true,
      data: doctors,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
