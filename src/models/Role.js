import mongoose from 'mongoose';

const RoleSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Role name is required'],
      trim: true,
      unique: true,
    },
    rank: {
      type: Number,
      required: [true, 'Rank is required'],
      min: 0,
    },
    isRoot: {
      type: Boolean,
      default: false,
    },
    sellerRate: {
      type: Number,
      default: 0,
      min: 0,
      description: '₹ per SQ. FT. earned when user of this role is direct seller',
    },
    overrideRate: {
      type: Number,
      default: 0,
      min: 0,
      description: '₹ per SQ. FT. earned when user in downline sells',
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
  },
  { timestamps: true }
);

// Indexes
RoleSchema.index({ rank: 1 });

export default mongoose.models.Role || mongoose.model('Role', RoleSchema);
