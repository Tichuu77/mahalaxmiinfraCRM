import mongoose from 'mongoose';

const RegistrySchema = new mongoose.Schema(
  {
    bookingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Booking',
      required: true,
      unique: true,
    },
    plotId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Plot',
      required: true,
    },
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Customer',
      required: true,
    },
    sellerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    registryNumber: {
      type: String,
      required: [true, 'Registry / Khasra / Document number is required'],
      trim: true,
    },
    registryDate: {
      type: Date,
      required: [true, 'Registry date is required'],
    },
    registryOffice: {
      type: String,
      trim: true,
      default: '',
    },
    stampDutyAmount: {
      type: Number,
      default: 0,
    },
    status: {
      type: String,
      enum: ['pending', 'completed', 'on_hold'],
      default: 'pending',
    },
    remarks: {
      type: String,
      trim: true,
      default: '',
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  { timestamps: true }
);

RegistrySchema.index({ sellerId: 1 });
RegistrySchema.index({ status: 1 });

export default mongoose.models.Registry || mongoose.model('Registry', RegistrySchema);
