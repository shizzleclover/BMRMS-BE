import mongoose from 'mongoose';

const clinicSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Clinic name is required'],
      trim: true,
    },
    clinicCode: {
      type: String,
      unique: true,
      required: true,
    },
    description: {
      type: String,
      trim: true,
    },
    address: {
      street: {
        type: String,
        required: true,
      },
      city: {
        type: String,
        required: true,
      },
      state: {
        type: String,
        required: true,
      },
      country: {
        type: String,
        required: true,
      },
      zipCode: {
        type: String,
        required: true,
      },
    },
    contact: {
      phone: {
        type: String,
        required: true,
      },
      email: {
        type: String,
        required: true,
        lowercase: true,
      },
      website: String,
    },
    operatingHours: {
      monday: { open: String, close: String },
      tuesday: { open: String, close: String },
      wednesday: { open: String, close: String },
      thursday: { open: String, close: String },
      friday: { open: String, close: String },
      saturday: { open: String, close: String },
      sunday: { open: String, close: String },
    },
    services: [
      {
        type: String,
        trim: true,
      },
    ],
    specializations: [
      {
        type: String,
        trim: true,
      },
    ],
    adminId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    staff: [
      {
        userId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
        },
        role: {
          type: String,
          enum: ['doctor', 'nurse', 'receptionist', 'admin'],
        },
        joinedDate: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    isActive: {
      type: Boolean,
      default: true,
    },
    licenseNumber: {
      type: String,
      trim: true,
    },
    accreditation: {
      body: String,
      number: String,
      validUntil: Date,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes
// clinicSchema.index({ clinicCode: 1 });
clinicSchema.index({ adminId: 1 });
clinicSchema.index({ 'address.city': 1, 'address.state': 1 });

// Auto-generate clinic code.
// Use `validate` so the required `clinicCode` exists before Mongoose validates.
clinicSchema.pre('validate', async function (next) {
  if (!this.clinicCode) {
    const count = await mongoose.model('Clinic').countDocuments();
    this.clinicCode = `CLI${String(count + 1).padStart(5, '0')}`;
  }
  next();
});

// Virtual for patients
clinicSchema.virtual('patients', {
  ref: 'Patient',
  localField: '_id',
  foreignField: 'primaryClinic',
});

const Clinic = mongoose.model('Clinic', clinicSchema);

export default Clinic;
