import express from 'express';
import * as clinicService from '../services/clinic.service.js';
import { protect, authorize } from '../middleware/auth.js';
import { validate, commonSchemas } from '../middleware/validate.js';
import { z } from 'zod';

const router = express.Router();

// Validation schemas
const createClinicSchema = z.object({
  body: z.object({
    name: z.string().min(1, 'Clinic name is required'),
    description: z.string().optional(),
    address: z.object({
      street: z.string().min(1),
      city: z.string().min(1),
      state: z.string().min(1),
      country: z.string().min(1),
      zipCode: z.string().min(1),
    }),
    contact: z.object({
      phone: commonSchemas.phone,
      email: commonSchemas.email,
      website: z.string().url().optional().or(z.literal('')),
    }),
    operatingHours: z.record(z.object({
      open: z.string(),
      close: z.string(),
    })).optional(),
    services: z.array(z.string()).optional(),
    specializations: z.array(z.string()).optional(),
    licenseNumber: z.string().optional(),
  }),
});

const staffSchema = z.object({
  body: z.object({
    userId: commonSchemas.objectId,
    role: z.enum(['doctor', 'nurse', 'receptionist', 'admin']),
  }),
});

// Routes
router.post(
  '/',
  protect,
  authorize('admin'),
  validate(createClinicSchema),
  async (req, res, next) => {
    try {
      const clinic = await clinicService.createClinic(req.body, req.user._id);
      res.status(201).json({
        success: true,
        message: 'Clinic created successfully',
        data: clinic,
      });
    } catch (error) {
      next(error);
    }
  }
);

router.get('/', protect, async (req, res, next) => {
  try {
    const { page, limit, ...filters } = req.query;
    const result = await clinicService.getAllClinics(filters, { page, limit });
    res.json({
      success: true,
      data: result.clinics,
      pagination: {
        total: result.total,
        page: result.page,
        pages: result.pages,
      },
    });
  } catch (error) {
    next(error);
  }
});

router.get('/:id', protect, async (req, res, next) => {
  try {
    const clinic = await clinicService.getClinicById(req.params.id);
    res.json({
      success: true,
      data: clinic,
    });
  } catch (error) {
    next(error);
  }
});

router.patch(
  '/:id',
  protect,
  authorize('admin'), // Or clinic admin, but 'admin' for now
  async (req, res, next) => {
    try {
      const clinic = await clinicService.updateClinic(req.params.id, req.body);
      res.json({
        success: true,
        message: 'Clinic updated successfully',
        data: clinic,
      });
    } catch (error) {
      next(error);
    }
  }
);

router.post(
  '/:id/staff',
  protect,
  authorize('admin'),
  validate(staffSchema),
  async (req, res, next) => {
    try {
      const clinic = await clinicService.addStaff(req.params.id, req.body);
      res.json({
        success: true,
        message: 'Staff added successfully',
        data: clinic,
      });
    } catch (error) {
      next(error);
    }
  }
);

router.delete(
  '/:id/staff/:userId',
  protect,
  authorize('admin'),
  async (req, res, next) => {
    try {
      const clinic = await clinicService.removeStaff(req.params.id, req.params.userId);
      res.json({
        success: true,
        message: 'Staff removed successfully',
        data: clinic,
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
