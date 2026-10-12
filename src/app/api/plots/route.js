import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import Plot from '@/models/Plot';
import Project from '@/models/Project';
import { getAuthUser } from '@/lib/auth';
import { PlotSchema } from '@/lib/validations';
import { invalidateCache } from '@/lib/cache';

export const dynamic = 'force-dynamic';

export async function GET(req) {
  try {
    await connectDB();
    const user = await getAuthUser(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    const projectId = searchParams.get('projectId');
    const status = searchParams.get('status');
    const facing = searchParams.get('facing');
    const search = searchParams.get('search');

    if (id) {
      const plot = await Plot.findOne({ _id: id, isDeleted: { $ne: true } })
        .populate('projectId', 'name code location totalAreaSqFt description status')
        .populate('createdBy', 'name email phone')
        .lean();

      if (!plot) return NextResponse.json({ error: 'Plot not found' }, { status: 404 });
      return NextResponse.json({ success: true, plot });
    }

    const filter = { isDeleted: { $ne: true } };
    if (projectId) filter.projectId = projectId;
    if (status && status !== 'all') filter.status = status;
    if (facing && facing !== 'all') filter.facing = facing;
    if (search && search.trim()) {
      filter.plotNumber = { $regex: search.trim(), $options: 'i' };
    }

    // Section 5.1: Visible to everyone unrestricted
    const plots = await Plot.find(filter)
      .populate('projectId', 'name code location')
      .populate('createdBy', 'name email')
      .sort({ plotNumber: 1 })
      .lean();

    return NextResponse.json({ success: true, plots });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    await connectDB();
    const user = await getAuthUser(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // Section 5.1: Create Plot is restricted to Admin only
    if (!user.roleId?.isRoot && user.roleId?.rank !== 0) {
      return NextResponse.json({ error: 'Forbidden: Only Admin can create plots' }, { status: 403 });
    }

    const body = await req.json();
    const validated = PlotSchema.parse(body);

    const existing = await Plot.findOne({
      projectId: validated.projectId,
      plotNumber: validated.plotNumber,
      isDeleted: { $ne: true },
    });
    if (existing) {
      return NextResponse.json({ error: 'Plot number already exists in this project' }, { status: 400 });
    }

    const totalPrice = validated.sizeSqFt * validated.ratePerSqFt;

    const plot = await Plot.create({
      ...validated,
      totalPrice,
      isDeleted: false,
      createdBy: user._id,
    });

    const populated = await Plot.findById(plot._id).populate('projectId', 'name code location');

    invalidateCache('projects');
    invalidateCache('dashboard');

    return NextResponse.json({ success: true, plot: populated });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}

export async function PUT(req) {
  try {
    await connectDB();
    const user = await getAuthUser(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { _id, ...updateData } = body;
    if (!_id) return NextResponse.json({ error: 'Plot _id is required' }, { status: 400 });

    const currentPlot = await Plot.findOne({ _id, isDeleted: { $ne: true } });
    if (!currentPlot) return NextResponse.json({ error: 'Plot not found' }, { status: 404 });

    // Only Admin can edit plot specifications.
    const isAdmin = user.roleId?.isRoot || user.roleId?.rank === 0;
    if (!isAdmin && (updateData.sizeSqFt || updateData.ratePerSqFt || updateData.plotNumber)) {
      return NextResponse.json({ error: 'Forbidden: Only Admin can edit plot specifications' }, { status: 403 });
    }

    if (updateData.plotNumber && updateData.plotNumber !== currentPlot.plotNumber) {
      const existing = await Plot.findOne({
        projectId: currentPlot.projectId,
        plotNumber: updateData.plotNumber,
        _id: { $ne: _id },
        isDeleted: { $ne: true },
      });
      if (existing) {
        return NextResponse.json({ error: 'Plot number already exists in this project' }, { status: 400 });
      }
    }

    if (updateData.sizeSqFt || updateData.ratePerSqFt) {
      const size = updateData.sizeSqFt !== undefined ? Number(updateData.sizeSqFt) : currentPlot.sizeSqFt;
      const rate = updateData.ratePerSqFt !== undefined ? Number(updateData.ratePerSqFt) : currentPlot.ratePerSqFt;
      updateData.totalPrice = size * rate;
    }

    const updated = await Plot.findByIdAndUpdate(_id, updateData, { new: true })
      .populate('projectId', 'name code location')
      .lean();

    invalidateCache('projects');
    invalidateCache('dashboard');

    return NextResponse.json({ success: true, plot: updated });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}

export async function DELETE(req) {
  try {
    await connectDB();
    const user = await getAuthUser(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    if (!user.roleId?.isRoot && user.roleId?.rank !== 0) {
      return NextResponse.json({ error: 'Forbidden: Only Admin can delete plots' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const plotId = searchParams.get('id');
    if (!plotId) return NextResponse.json({ error: 'Plot ID is required' }, { status: 400 });

    const plot = await Plot.findOne({ _id: plotId, isDeleted: { $ne: true } });
    if (!plot) return NextResponse.json({ error: 'Plot not found or already deleted' }, { status: 404 });

    // Soft delete plot
    await Plot.findByIdAndUpdate(plotId, {
      isDeleted: true,
      deletedAt: new Date(),
    });

    invalidateCache('projects');
    invalidateCache('dashboard');

    return NextResponse.json({ success: true, message: 'Plot deleted successfully (soft delete)' });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
