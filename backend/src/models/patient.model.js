import mongoose from 'mongoose';

const patientSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    patientNumber: {
      type: String,
      unique: true,
      required: true,
    },
    bloodType: {
      type: String,
      enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'],
    },
    allergies: [
      {
        name: String,
        severity: {
          type: String,
          enum: ['mild', 'moderate', 'severe'],
        },
        notes: String,
      },
    ],
    chronicConditions: [
      {
        condition: String,
        diagnosedDate: Date,
        status: {
          type: String,
          enum: ['active', 'managed', 'resolved'],
          default: 'active',
        },
      },
    ],
    medications: [
      {
        name: String,
        dosage: String,
        frequency: String,
        startDate: Date,
        endDate: Date,
        prescribedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
        },
      },
    ],
    emergencyContact: {
      name: String,
      relationship: String,
      phone: String,
      email: String,
    },
    insuranceInfo: {
      provider: String,
      policyNumber: String,
      groupNumber: String,
      validUntil: Date,
    },
    primaryClinic: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Clinic',
    },
    assignedClinics: [
      {
        clinicId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Clinic',
        },
        assignedDate: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes
patientSchema.index({ userId: 1 });
// patientSchema.index({ patientNumber: 1 });
patientSchema.index({ primaryClinic: 1 });

// Auto-generate patient number.
// Use `validate` so the value exists before Mongoose validates required fields.
patientSchema.pre('validate', async function (next) {
  if (!this.patientNumber) {
    const count = await mongoose.model('Patient').countDocuments();
    this.patientNumber = `PAT${String(count + 1).padStart(6, '0')}`;
  }
  next();
});

// Virtual for medical records
patientSchema.virtual('medicalRecords', {
  ref: 'MedicalRecord',
  localField: '_id',
  foreignField: 'patientId',
});

const Patient = mongoose.model('Patient', patientSchema);

export default Patient;
