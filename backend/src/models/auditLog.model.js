import mongoose from 'mongoose';

const auditLogSchema = new mongoose.Schema(
  {
    action: {
      type: String,
      enum: [
        'record_created',
        'record_accessed',
        'record_updated',
        'record_deleted',
        'consent_granted',
        'consent_revoked',
        'user_login',
        'user_logout',
        'patient_created',
        'patient_updated',
        'clinic_created',
        'clinic_updated',
        'sync_initiated',
        'sync_completed',
      ],
      required: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    targetResource: {
      resourceType: {
        type: String,
        enum: ['MedicalRecord', 'Patient', 'User', 'Clinic', 'Consent'],
      },
      resourceId: {
        type: mongoose.Schema.Types.ObjectId,
      },
    },
    clinicId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Clinic',
    },
    ipAddress: {
      type: String,
    },
    userAgent: {
      type: String,
    },
    details: {
      type: mongoose.Schema.Types.Mixed,
    },
    status: {
      type: String,
      enum: ['success', 'failure', 'pending'],
      default: 'success',
    },
    errorMessage: {
      type: String,
    },
    // Blockchain reference
    blockchainTxHash: {
      type: String,
    },
    isOnChain: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for efficient querying
auditLogSchema.index({ userId: 1, createdAt: -1 });
auditLogSchema.index({ action: 1, createdAt: -1 });
auditLogSchema.index({ 'targetResource.resourceType': 1, 'targetResource.resourceId': 1 });
auditLogSchema.index({ clinicId: 1, createdAt: -1 });
auditLogSchema.index({ blockchainTxHash: 1 });
auditLogSchema.index({ createdAt: -1 });

// Static method to create audit log
auditLogSchema.statics.createLog = async function (logData) {
  try {
    const log = new this(logData);

    // Dynamic import to avoid circular dependencies
    const { logAuditOnChain } = await import('../services/blockchain.service.js');

    const blockchainResult = await logAuditOnChain(
      log.action,
      log.userId ? log.userId.toString() : 'system',
      log.targetResource?.resourceId ? log.targetResource.resourceId.toString() : 'none',
      log.targetResource?.resourceType ? log.targetResource.resourceType : 'System'
    );

    if (blockchainResult && blockchainResult.transactionHash) {
      log.blockchainTxHash = blockchainResult.transactionHash;
      log.isOnChain = true;
    } else if (logData.blockchainTxHash) {
      // Fallback: Use the main resource's tx hash if AuditTrail skipped this event
      log.blockchainTxHash = logData.blockchainTxHash;
      log.isOnChain = true;
    }

    await log.save();
    return log;
  } catch (error) {
    console.error('Failed to create audit log:', error);
    // Don't throw error to prevent audit logging from breaking main functionality
    return null;
  }
};

const AuditLog = mongoose.model('AuditLog', auditLogSchema);

export default AuditLog;
