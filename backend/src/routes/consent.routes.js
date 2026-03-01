import express from 'express';
import * as consentService from '../services/consent.service.js';
import { protect, authorize } from '../middleware/auth.js';
import { validate, commonSchemas } from '../middleware/validate.js';
import { z } from 'zod';

const router = express.Router();

// Validation schemas
const grantConsentSchema = z.object({
  body: z.object({
    grantedToUserId: commonSchemas.objectId,
    clinicId: commonSchemas.objectId.optional(),
    accessLevel: z.enum(['read', 'write', 'full']).default('read'),
    scope: z.enum(['all_records', 'specific_records', 'record_type']).default('all_records'),
    expiresAt: z.string().optional(),
  }),
});

// Routes
router.post(
  '/grant',
  protect,
  authorize('patient', 'admin'),
  validate(grantConsentSchema),
  async (req, res, next) => {
    try {
      const consent = await consentService.grantConsent(req.body, req.user._id);
      res.status(201).json({
        success: true,
        message: 'Consent granted successfully',
        data: consent,
      });
    } catch (error) {
      next(error);
    }
  }
);

router.delete('/:id', protect, async (req, res, next) => {
  try {
    // Basic authorization: user must be the patient related to the consent or an admin
    // This is handled inside consentService or can be added as middleware
    const consent = await consentService.revokeConsent(req.params.id, req.user._id);
    res.json({
      success: true,
      message: 'Consent revoked successfully',
      data: consent,
    });
  } catch (error) {
    next(error);
  }
});

router.get('/my-consents', protect, authorize('patient', 'doctor', 'admin'), async (req, res, next) => {
  try {
    const consents = await consentService.getPatientConsents(req.user._id);
    res.json({
      success: true,
      data: consents,
    });
  } catch (error) {
    next(error);
  }
});

router.get('/check-access/:patientId', protect, authorize('doctor'), async (req, res, next) => {
  try {
    const hasAccess = await consentService.checkAccessConsent(req.params.patientId, req.user._id);
    res.json({
      success: true,
      hasAccess,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
