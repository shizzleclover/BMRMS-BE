import AuditLog from '../models/auditLog.model.js';
import SyncQueue from '../models/syncQueue.model.js';
import MedicalRecord from '../models/medicalRecord.model.js';
import Patient from '../models/patient.model.js';
import Consent from '../models/consent.model.js';
import { AppError } from '../middleware/errorHandler.js';

/**
 * Get audit logs with filtering
 */
export const getAuditLogs = async (filters = {}, options = {}) => {
  const { page = 1, limit = 20 } = options;
  const skip = (page - 1) * limit;

  const logs = await AuditLog.find(filters)
    .populate('userId', 'firstName lastName email role')
    .populate('clinicId', 'name clinicCode')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);

  const total = await AuditLog.countDocuments(filters);

  return {
    logs,
    total,
    page,
    pages: Math.ceil(total / limit),
  };
};

/**
 * Handle Sync Push (from client to server)
 */
export const handleSyncPush = async (syncData, userId, clinicId) => {
  const { operations } = syncData; // Array of { resourceType, operation, data, clientTimestamp }

  const results = [];

  for (const op of operations) {
    try {
      // 1. Queue the operation
      const queueItem = await SyncQueue.create({
        userId,
        clinicId,
        resourceType: op.resourceType,
        operation: op.operation,
        data: op.data,
        clientTimestamp: new Date(op.clientTimestamp),
        status: 'pending',
      });

      // 2. Process immediately (simplistic for MVP)
      // In production, this might be handled by a background worker
      // For MVP, we'll just log it and mark as processed
      // (Actual model updates would go here)
      
      queueItem.status = 'completed';
      queueItem.processedAt = new Date();
      await queueItem.save();

      results.push({
        clientTimestamp: op.clientTimestamp,
        status: 'success',
        queueId: queueItem._id,
      });
    } catch (error) {
      results.push({
        clientTimestamp: op.clientTimestamp,
        status: 'failed',
        error: error.message,
      });
    }
  }

  return results;
};

/**
 * Handle Sync Pull (from server to client)
 */
export const handleSyncPull = async (lastSyncTimestamp, userId, clinicId) => {
  const sinceDate = lastSyncTimestamp ? new Date(lastSyncTimestamp) : new Date(0);

  // For MVP, we'll pull records, patients, and consents modified since sinceDate
  const records = await MedicalRecord.find({
    updatedAt: { $gt: sinceDate },
    $or: [{ doctorId: userId }, { clinicId }],
    isLatestVersion: true,
  });

  const patients = await Patient.find({
    updatedAt: { $gt: sinceDate },
    $or: [{ primaryClinic: clinicId }, { 'assignedClinics.clinicId': clinicId }],
  });

  const consents = await Consent.find({
    updatedAt: { $gt: sinceDate },
    $or: [{ 'grantedTo.userId': userId }, { 'grantedTo.clinicId': clinicId }],
    status: 'active',
  });

  return {
    serverTimestamp: new Date(),
    updates: {
      MedicalRecord: records,
      Patient: patients,
      Consent: consents,
    },
  };
};
