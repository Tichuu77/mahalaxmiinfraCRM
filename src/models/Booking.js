import mongoose from 'mongoose';

const BookingSchema = new mongoose.Schema(
  {
    bookingNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    plotId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Plot',
      required: [true, 'Plot is required'],
    },
    projectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Project',
      required: [true, 'Project is required'],
    },
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Customer',
      required: [true, 'Customer is required'],
    },
    sellerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Seller is required'],
      description: 'The user who made the sale (can be any rank)',
    },
    bookingAmount: {
      type: Number,
      required: [true, 'Booking amount is required'],
      min: 0,
    },
    totalPlotValue: {
      type: Number,
      required: [true, 'Total plot value is required'],
      min: 0,
    },
    paymentMode: {
      type: String,
      enum: ['Cheque', 'NEFT/RTGS', 'UPI', 'Cash', 'Demand Draft'],
      default: 'Cheque',
    },
    transactionReference: {
      type: String,
      trim: true,
      default: '',
    },
    status: {
      type: String,
      enum: ['pending', 'active', 'registry', 'cancelled'],
      default: 'pending',
    },
    bookingDate: {
      type: Date,
      default: Date.now,
    },
    activatedAt: {
      type: Date,
      default: null,
    },
    notes: {
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

BookingSchema.index({ sellerId: 1 });
BookingSchema.index({ sellerId: 1, status: 1 });
BookingSchema.index({ createdBy: 1 });
BookingSchema.index({ status: 1 });
BookingSchema.index({ plotId: 1 });
BookingSchema.index({ projectId: 1, status: 1 });
BookingSchema.index({ customerId: 1 });
BookingSchema.index({ createdAt: -1 });

export default mongoose.models.Booking || mongoose.model('Booking', BookingSchema);
