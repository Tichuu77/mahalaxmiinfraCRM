import mongoose from 'mongoose';

const ProjectSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Project name is required'],
      trim: true,
    },
    code: {
      type: String,
      required: [true, 'Project code is required'],
      trim: true,
      uppercase: true,
    },
    location: {
      type: String,
      required: [true, 'Location is required'],
      trim: true,
    },
    totalAreaSqFt: {
      type: Number,
      default: 0,
    },
    description: {
      type: String,
      trim: true,
    },
    status: {
      type: String,
      enum: ['active', 'completed', 'upcoming'],
      default: 'active',
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

ProjectSchema.index({ code: 1 }, { unique: true, partialFilterExpression: { isDeleted: false } });
ProjectSchema.index({ isDeleted: 1, status: 1 });

export default mongoose.models.Project || mongoose.model('Project', ProjectSchema);
