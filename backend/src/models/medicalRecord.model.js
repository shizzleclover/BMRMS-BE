import mongoose from 'mongoose';

const medicalRecordSchema = new mongoose.Schema(
  {
    recordNumber: {
      type: String,
      unique: true,
      required: true,
    },
    patientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Patient',
      required: true,
    },
    doctorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    clinicId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Clinic',
      required: true,
    },
    recordType: {
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
      required: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    diagnosis: {
      condition: String,
      icdCode: String,
      severity: {
        type: String,
        enum: ['mild', 'moderate', 'severe', 'critical'],
      },
      notes: String,
    },
    // IPFS storage
    ipfsHash: {
      type: String,
      required: true,
    },
    fileMetadata: {
      fileName: String,
      fileType: String,
      fileSize: Number,
      encryptionMethod: String,
    },
    // Blockchain reference
    blockchainHash: {
      type: String,
      required: true,
    },
    blockchainTxHash: {
      type: String,
    },
    // Versioning
    version: {
      type: Number,
      default: 1,
    },
    previousVersionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'MedicalRecord',
    },
    isLatestVersion: {
      type: Boolean,
      default: true,
    },
    // Metadata
    visitDate: {
      type: Date,
      default: Date.now,
    },
    tags: [String],
    isDeleted: {
      type: Boolean,
      default: false,
    },
    deletedAt: Date,
    deletedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes
medicalRecordSchema.index({ recordNumber: 1 });
medicalRecordSchema.index({ patientId: 1, visitDate: -1 });
medicalRecordSchema.index({ doctorId: 1 });
medicalRecordSchema.index({ clinicId: 1 });
medicalRecordSchema.index({ blockchainHash: 1 });
medicalRecordSchema.index({ isLatestVersion: 1 });

// Auto-generate record number
medicalRecordSchema.pre('save', async function (next) {
  if (!this.recordNumber) {
    const count = await mongoose.model('MedicalRecord').countDocuments();
    this.recordNumber = `REC${String(count + 1).padStart(8, '0')}`;
  }
  next();
});

// Soft delete method
medicalRecordSchema.methods.softDelete = function (userId) {
  this.isDeleted = true;
  this.deletedAt = new Date();
  this.deletedBy = userId;
  return this.save();
};

const MedicalRecord = mongoose.model('MedicalRecord', medicalRecordSchema);

export default MedicalRecord;
