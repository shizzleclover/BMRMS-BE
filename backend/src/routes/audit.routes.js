import express from 'express';
import * as syncService from '../services/sync.service.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

/**
 * Get audit logs (Admin only)
 */
router.get('/', protect, authorize('admin'), async (req, res, next) => {
  try {
    const { page, limit, ...filters } = req.query;
    const result = await syncService.getAuditLogs(filters, { page, limit });

    res.json({
      success: true,
      data: result.logs,
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

/**
 * Get audit logs for a specific resource
 */
router.get('/resource/:type/:id', protect, authorize('admin', 'doctor'), async (req, res, next) => {
  try {
    const filters = {
      'targetResource.resourceType': req.params.type,
      'targetResource.resourceId': req.params.id,
    };
    const result = await syncService.getAuditLogs(filters, { limit: 100 });

    res.json({
      success: true,
      data: result.logs,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
