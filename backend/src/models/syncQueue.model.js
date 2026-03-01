import mongoose from 'mongoose';

const syncQueueSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    clinicId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Clinic',
    },
    operation: {
      type: String,
      enum: ['create', 'update', 'delete'],
      required: true,
    },
    resourceType: {
      type: String,
      enum: ['MedicalRecord', 'Patient', 'Consent', 'User'],
      required: true,
    },
    resourceId: {
      type: mongoose.Schema.Types.ObjectId,
    },
    data: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
    },
    status: {
      type: String,
      enum: ['pending', 'processing', 'completed', 'failed'],
      default: 'pending',
    },
    priority: {
      type: Number,
      default: 0,
    },
    retryCount: {
      type: Number,
      default: 0,
    },
    maxRetries: {
      type: Number,
      default: 3,
    },
    lastError: {
      type: String,
    },
    processedAt: {
      type: Date,
    },
    completedAt: {
      type: Date,
    },
    // Conflict resolution
    conflictResolution: {
      strategy: {
        type: String,
        enum: ['latest_wins', 'manual', 'merge'],
        default: 'latest_wins',
      },
      conflictedWith: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'SyncQueue',
      },
      resolved: {
        type: Boolean,
        default: false,
      },
    },
    // Client metadata
    clientTimestamp: {
      type: Date,
      required: true,
    },
    deviceId: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
syncQueueSchema.index({ userId: 1, status: 1 });
syncQueueSchema.index({ status: 1, priority: -1, createdAt: 1 });
syncQueueSchema.index({ resourceType: 1, resourceId: 1 });
syncQueueSchema.index({ clinicId: 1, status: 1 });

// Mark as failed if max retries exceeded
syncQueueSchema.methods.incrementRetry = function (errorMessage) {
  this.retryCount += 1;
  this.lastError = errorMessage;

  if (this.retryCount >= this.maxRetries) {
    this.status = 'failed';
  } else {
    this.status = 'pending';
  }

  return this.save();
};

// Mark as completed
syncQueueSchema.methods.markCompleted = function () {
  this.status = 'completed';
  this.completedAt = new Date();
  return this.save();
};

const SyncQueue = mongoose.model('SyncQueue', syncQueueSchema);

export default SyncQueue;
