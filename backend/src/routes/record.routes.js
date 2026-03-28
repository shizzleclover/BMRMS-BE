import express from 'express';
import * as recordService from '../services/record.service.js';
import { protect, authorize } from '../middleware/auth.js';
import { uploadSingle } from '../middleware/upload.js';
import { validate, commonSchemas } from '../middleware/validate.js';
import { AppError } from '../middleware/errorHandler.js';
import MedicalRecord from '../models/medicalRecord.model.js';
import { z } from 'zod';

const router = express.Router();

// Validation schemas
const createRecordSchema = z.object({
  body: z.object({
    patientId: commonSchemas.objectId,
    recordType: z.enum([
      'consultation', 'diagnosis', 'prescription', 'lab_result',
      'imaging', 'surgery', 'vaccination', 'other'
    ]),
    title: z.string().min(1),
    description: z.string().optional(),
    diagnosis: z.object({
      condition: z.string().optional(),
      icdCode: z.string().optional(),
      severity: z.enum(['mild', 'moderate', 'severe', 'critical']).optional(),
      notes: z.string().optional(),
    }).optional(),
  }),
});

// Routes
router.post(
  '/',
  protect,
  authorize('doctor', 'admin'),
  uploadSingle('file'),
  validate(createRecordSchema),
  async (req, res, next) => {
    try {
      const record = await recordService.createRecord(
        req.body,
        req.file,
        req.user._id,
        req.user.clinicId
      );

      res.status(201).json({
        success: true,
        message: 'Medical record created successfully',
        data: record,
      });
    } catch (error) {
      next(error);
    }
  }
);

router.get('/patient/:patientId', protect, async (req, res, next) => {
  try {
    await recordService.assertCanAccessPatientRecords(req.user, req.params.patientId);
    const records = await recordService.getPatientRecords(req.params.patientId, req.query);
    res.json({
      success: true,
      data: records,
    });
  } catch (error) {
    next(error);
  }
});

router.get('/:id', protect, async (req, res, next) => {
  try {
    const meta = await MedicalRecord.findById(req.params.id).select('patientId');
    if (!meta) {
      return next(new AppError('Record not found', 404));
    }
    await recordService.assertCanAccessPatientRecords(req.user, meta.patientId);
    const record = await recordService.getRecordById(req.params.id);
    res.json({
      success: true,
      data: record,
    });
  } catch (error) {
    next(error);
  }
});

router.get('/:id/download', protect, async (req, res, next) => {
  try {
    const meta = await MedicalRecord.findById(req.params.id).select('patientId');
    if (!meta) {
      return next(new AppError('Record not found', 404));
    }
    await recordService.assertCanAccessPatientRecords(req.user, meta.patientId);
    const { buffer, fileName, fileType } = await recordService.downloadRecordFile(req.params.id);
    
    res.setHeader('Content-Type', fileType);
    res.setHeader('Content-Disposition', `attachment; filename=${fileName}`);
    res.send(buffer);
  } catch (error) {
    next(error);
  }
});

router.get('/:id/verify', protect, async (req, res, next) => {
  try {
    const meta = await MedicalRecord.findById(req.params.id).select('patientId');
    if (!meta) {
      return next(new AppError('Record not found', 404));
    }
    await recordService.assertCanAccessPatientRecords(req.user, meta.patientId);
    const result = await recordService.verifyIntegrity(req.params.id);
    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
