import mongoose from 'mongoose';

const PlotSchema = new mongoose.Schema(
  {
    projectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Project',
      required: [true, 'Project is required'],
    },
    plotNumber: {
      type: String,
      required: [true, 'Plot number is required'],
      trim: true,
    },
    sizeSqFt: {
      type: Number,
      required: [true, 'Plot size in SQ. FT. is required'],
      min: 1,
    },
    ratePerSqFt: {
      type: Number,
      required: [true, 'Rate per SQ. FT. is required'],
      min: 0,
    },
    totalPrice: {
      type: Number,
      required: true,
    },
    dimension: {
      type: String,
      trim: true,
      default: '', // e.g. '30x50'
    },
    facing: {
      type: String,
      enum: ['East', 'West', 'North', 'South', 'North-East', 'North-West', 'South-East', 'South-West', 'Other'],
      default: 'East',
    },
    status: {
      type: String,
      enum: ['available', 'reserved', 'booked', 'registered', 'cancelled'],
      default: 'available',
    },
    isDeleted: {
      type: Boolean,
      default: false,
      index: true,
    },
    deletedAt: {
      type: Date,
      default: null,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  { timestamps: true }
);

PlotSchema.index({ projectId: 1, plotNumber: 1 }, { unique: true, partialFilterExpression: { isDeleted: false } });
PlotSchema.index({ status: 1 });
PlotSchema.index({ projectId: 1, status: 1, isDeleted: 1 });
PlotSchema.index({ isDeleted: 1, status: 1 });

export default mongoose.models.Plot || mongoose.model('Plot', PlotSchema);
