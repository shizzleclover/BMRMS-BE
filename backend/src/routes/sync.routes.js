import express from 'express';
import * as syncService from '../services/sync.service.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

/**
 * Pull updates from server
 * GET /api/v1/sync/pull?lastSync=...
 */
router.get('/pull', protect, async (req, res, next) => {
  try {
    const { lastSync } = req.query;
    const result = await syncService.handleSyncPull(
      lastSync,
      req.user._id,
      req.user.clinicId
    );

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Push updates to server
 * POST /api/v1/sync/push
 */
router.post('/push', protect, async (req, res, next) => {
  try {
    const result = await syncService.handleSyncPush(
      req.body,
      req.user._id,
      req.user.clinicId
    );

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
