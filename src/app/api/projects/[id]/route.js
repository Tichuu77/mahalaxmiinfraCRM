import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { connectDB } from '@/lib/db';
import Project from '@/models/Project';
import Plot from '@/models/Plot';
import { getAuthUser } from '@/lib/auth';
import { ProjectSchema } from '@/lib/validations';

export const dynamic = 'force-dynamic';

export async function GET(req, { params }) {
  try {
    await connectDB();
    const user = await getAuthUser(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const resolvedParams = await Promise.resolve(params);
    const id = resolvedParams?.id;
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid project ID' }, { status: 400 });
    }

    const project = await Project.findOne({ _id: id, isDeleted: { $ne: true } })
      .populate('createdBy', 'name email phone')
      .lean();

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    const [totalPlots, availablePlots, bookedPlots, registeredPlots, reservedPlots] = await Promise.all([
      Plot.countDocuments({ projectId: id, isDeleted: { $ne: true } }),
      Plot.countDocuments({ projectId: id, status: 'available', isDeleted: { $ne: true } }),
      Plot.countDocuments({ projectId: id, status: 'booked', isDeleted: { $ne: true } }),
      Plot.countDocuments({ projectId: id, status: 'registered', isDeleted: { $ne: true } }),
      Plot.countDocuments({ projectId: id, status: 'reserved', isDeleted: { $ne: true } }),
    ]);

    return NextResponse.json({
      success: true,
      project: {
        ...project,
        stats: { totalPlots, availablePlots, bookedPlots, registeredPlots, reservedPlots },
      },
    });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(req, { params }) {
  try {
    await connectDB();
    const user = await getAuthUser(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    if (!user.roleId?.isRoot && user.roleId?.rank !== 0) {
      return NextResponse.json({ error: 'Forbidden: Only Admin can edit projects' }, { status: 403 });
    }

    const resolvedParams = await Promise.resolve(params);
    const id = resolvedParams?.id;
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid project ID' }, { status: 400 });
    }

    const body = await req.json();
    const validated = ProjectSchema.partial().parse(body);

    if (validated.code) {
      const formattedCode = validated.code.toUpperCase();
      const existing = await Project.findOne({
        code: formattedCode,
        _id: { $ne: id },
        isDeleted: { $ne: true },
      });
      if (existing) {
        return NextResponse.json({ error: 'Project code already in use by another project' }, { status: 400 });
      }
      validated.code = formattedCode;
    }

    const updated = await Project.findOneAndUpdate(
      { _id: id, isDeleted: { $ne: true } },
      validated,
      { new: true }
    );

    if (!updated) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, project: updated });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}

export async function DELETE(req, { params }) {
  try {
    await connectDB();
    const user = await getAuthUser(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    if (!user.roleId?.isRoot && user.roleId?.rank !== 0) {
      return NextResponse.json({ error: 'Forbidden: Only Admin can delete projects' }, { status: 403 });
    }

    const resolvedParams = await Promise.resolve(params);
    const id = resolvedParams?.id;
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid project ID' }, { status: 400 });
    }

    const project = await Project.findOne({ _id: id, isDeleted: { $ne: true } });
    if (!project) {
      return NextResponse.json({ error: 'Project not found or already deleted' }, { status: 404 });
    }

    // Soft delete project
    await Project.findByIdAndUpdate(id, {
      isDeleted: true,
      deletedAt: new Date(),
    });

    // Soft delete associated plots
    await Plot.updateMany(
      { projectId: id },
      { isDeleted: true, deletedAt: new Date() }
    );

    return NextResponse.json({ success: true, message: 'Project and associated plots deleted successfully (soft delete)' });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
