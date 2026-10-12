import mongoose from 'mongoose';

const ApprovalStepSchema = new mongoose.Schema(
  {
    approverId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    rank: {
      type: Number,
      required: true,
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
    },
    comments: {
      type: String,
      default: '',
    },
    actionDate: {
      type: Date,
      default: null,
    },
  },
  { _id: false }
);

const IncentiveSchema = new mongoose.Schema(
  {
    bookingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Booking',
      required: true,
    },
    recipientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      description: 'The user who earns this incentive (seller or upline)',
    },
    roleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Role',
      required: true,
    },
    rank: {
      type: Number,
      required: true,
    },
    basis: {
      type: String,
      enum: ['seller', 'override'],
      required: true,
      description: 'seller = direct seller cut; override = upline manager/director/admin cut',
    },
    plotSizeSqFt: {
      type: Number,
      required: true,
      min: 1,
    },
    ratePerSqFt: {
      type: Number,
      required: true,
      min: 0,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
      description: 'Calculated as plotSizeSqFt * ratePerSqFt',
    },
    status: {
      type: String,
      enum: ['draft', 'submitted', 'approved', 'rejected', 'voided'],
      default: 'submitted',
    },
    currentApproverId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    approvalChain: [ApprovalStepSchema],
    currentStepIndex: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

IncentiveSchema.index({ bookingId: 1 });
IncentiveSchema.index({ recipientId: 1 });
IncentiveSchema.index({ currentApproverId: 1 });
IncentiveSchema.index({ status: 1 });

export default mongoose.models.Incentive || mongoose.model('Incentive', IncentiveSchema);
