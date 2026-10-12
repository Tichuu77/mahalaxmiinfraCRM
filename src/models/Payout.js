import mongoose from 'mongoose';

const PayoutSchema = new mongoose.Schema(
  {
    billNumber: {
      type: String,
      required: true,
      unique: true,
    },
    bookingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Booking',
      required: true,
    },
    recipientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    incentiveId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Incentive',
      required: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'on_hold', 'rejected', 'paid'],
      default: 'pending',
    },
    paymentMode: {
      type: String,
      enum: ['Bank Transfer (NEFT/RTGS)', 'Cheque', 'UPI', 'Cash'],
      default: 'Bank Transfer (NEFT/RTGS)',
    },
    transactionReference: {
      type: String,
      trim: true,
      default: '',
    },
    paidAt: {
      type: Date,
      default: null,
    },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    remarks: {
      type: String,
      trim: true,
      default: '',
    },
  },
  { timestamps: true }
);

PayoutSchema.index({ recipientId: 1 });
PayoutSchema.index({ bookingId: 1 });
PayoutSchema.index({ status: 1 });

export default mongoose.models.Payout || mongoose.model('Payout', PayoutSchema);
