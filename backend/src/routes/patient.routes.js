import express from 'express';
import * as patientService from '../services/patient.service.js';
import { protect, authorize } from '../middleware/auth.js';
import { validate, commonSchemas } from '../middleware/validate.js';
import { z } from 'zod';

const router = express.Router();

// Validation schemas
const createPatientSchema = z.object({
  body: z.object({
    bloodType: z.enum(['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']).optional(),
    allergies: z.array(z.object({
      name: z.string(),
      severity: z.enum(['mild', 'moderate', 'severe']),
      notes: z.string().optional(),
    })).optional(),
    chronicConditions: z.array(z.object({
      condition: z.string(),
      diagnosedDate: z.string().optional(),
      status: z.enum(['active', 'managed', 'resolved']).optional(),
    })).optional(),
    emergencyContact: z.object({
      name: z.string(),
      relationship: z.string(),
      phone: commonSchemas.phone,
      email: commonSchemas.email.optional(),
    }).optional(),
    insuranceInfo: z.object({
      provider: z.string(),
      policyNumber: z.string(),
      groupNumber: z.string().optional(),
      validUntil: z.string().optional(),
    }).optional(),
    primaryClinic: commonSchemas.objectId.optional(),
  }),
});

const assignClinicSchema = z.object({
  body: z.object({
    clinicId: commonSchemas.objectId,
  }),
});

// Routes
router.post(
  '/',
  protect,
  validate(createPatientSchema),
  async (req, res, next) => {
    try {
      const patient = await patientService.createPatient(req.body, req.user._id);
      res.status(201).json({
        success: true,
        message: 'Patient profile created successfully',
        data: patient,
      });
    } catch (error) {
      next(error);
    }
  }
);

router.get(
  '/',
  protect,
  authorize('admin', 'doctor'),
  async (req, res, next) => {
    try {
      const { page, limit, ...filters } = req.query;
      const result = await patientService.getAllPatients(filters, { page, limit });
      res.json({
        success: true,
        data: result.patients,
        pagination: {
          total: result.total,
          page: result.page,
          pages: result.pages,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

router.get('/:id', protect, async (req, res, next) => {
  try {
    // For MVP: Patients can see their own profile, doctors/admins can see all
    // In production, we'd add more granular consent checking here
    const patient = await patientService.getPatientById(req.params.id);
    
    if (
      req.user.role !== 'admin' && 
      req.user.role !== 'doctor' && 
      patient.userId._id.toString() !== req.user._id.toString()
    ) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view this patient profile',
      });
    }

    res.json({
      success: true,
      data: patient,
    });
  } catch (error) {
    next(error);
  }
});

router.patch('/:id', protect, async (req, res, next) => {
  try {
    const patient = await patientService.getPatientById(req.params.id);

    if (
      req.user.role !== 'admin' &&
      patient.userId._id.toString() !== req.user._id.toString()
    ) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this patient profile',
      });
    }

    const updatedPatient = await patientService.updatePatient(req.params.id, req.body);
    res.json({
      success: true,
      message: 'Patient profile updated successfully',
      data: updatedPatient,
    });
  } catch (error) {
    next(error);
  }
});

router.post(
  '/:id/assign-clinic',
  protect,
  validate(assignClinicSchema),
  async (req, res, next) => {
    try {
      const patient = await patientService.assignToClinic(req.params.id, req.body.clinicId);
      res.json({
        success: true,
        message: 'Patient assigned to clinic successfully',
        data: patient,
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
