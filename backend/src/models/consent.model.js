import mongoose from 'mongoose';

const consentSchema = new mongoose.Schema(
  {
    patientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Patient',
      required: true,
    },
    grantedTo: {
      userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
      },
      clinicId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Clinic',
      },
    },
    accessLevel: {
      type: String,
      enum: ['read', 'write', 'full'],
      default: 'read',
      required: true,
    },
    scope: {
      type: String,
      enum: ['all_records', 'specific_records', 'record_type'],
      default: 'all_records',
    },
    specificRecords: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'MedicalRecord',
      },
    ],
    recordTypes: [
      {
        type: String,
        enum: [
          'consultation',
          'diagnosis',
          'prescription',
          'lab_result',
          'imaging',
          'surgery',
          'vaccination',
          'other',
        ],
      },
    ],
    status: {
      type: String,
      enum: ['active', 'revoked', 'expired'],
      default: 'active',
    },
    grantedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    grantedAt: {
      type: Date,
      default: Date.now,
    },
    expiresAt: {
      type: Date,
    },
    revokedAt: {
      type: Date,
    },
    revokedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    reason: {
      type: String,
      trim: true,
    },
    // Blockchain reference
    blockchainTxHash: {
      type: String,
    },
    blockchainEventId: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
consentSchema.index({ patientId: 1, status: 1 });
consentSchema.index({ 'grantedTo.userId': 1, status: 1 });
consentSchema.index({ 'grantedTo.clinicId': 1, status: 1 });
consentSchema.index({ expiresAt: 1 });

// Check if consent is valid
consentSchema.methods.isValid = function () {
  if (this.status !== 'active') {
    return false;
  }

  if (this.expiresAt && this.expiresAt < new Date()) {
    return false;
  }

  return true;
};

// Revoke consent method
consentSchema.methods.revoke = function (userId, reason) {
  this.status = 'revoked';
  this.revokedAt = new Date();
  this.revokedBy = userId;
  if (reason) {
    this.reason = reason;
  }
  return this.save();
};

// Auto-expire check
consentSchema.pre('save', function (next) {
  if (this.expiresAt && this.expiresAt < new Date() && this.status === 'active') {
    this.status = 'expired';
  }
  next();
});

const Consent = mongoose.model('Consent', consentSchema);

export default Consent;
