import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { connectDB } from '@/lib/db';
import Plot from '@/models/Plot';
import Booking from '@/models/Booking';
import { getAuthUser } from '@/lib/auth';
import { PlotSchema } from '@/lib/validations';

export const dynamic = 'force-dynamic';

export async function GET(req, { params }) {
  try {
    await connectDB();
    const user = await getAuthUser(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const resolvedParams = await Promise.resolve(params);
    const id = resolvedParams?.id;
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid plot ID' }, { status: 400 });
    }

    const plot = await Plot.findOne({ _id: id, isDeleted: { $ne: true } })
      .populate('projectId', 'name code location totalAreaSqFt description status')
      .populate('createdBy', 'name email phone')
      .lean();

    if (!plot) return NextResponse.json({ error: 'Plot not found' }, { status: 404 });

    // Check if there is an active booking on this plot
    const activeBooking = await Booking.findOne({
      plotId: id,
      status: { $ne: 'cancelled' },
    })
      .populate('customerId', 'name phone email')
      .populate('sellerId', 'name phone email')
      .lean();

    return NextResponse.json({
      success: true,
      plot,
      booking: activeBooking || null,
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

    const resolvedParams = await Promise.resolve(params);
    const id = resolvedParams?.id;
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid plot ID' }, { status: 400 });
    }

    const currentPlot = await Plot.findOne({ _id: id, isDeleted: { $ne: true } });
    if (!currentPlot) return NextResponse.json({ error: 'Plot not found' }, { status: 404 });

    // Only Admin can edit plot specifications.
    const isAdmin = user.roleId?.isRoot || user.roleId?.rank === 0;
    const body = await req.json();

    if (!isAdmin && (body.sizeSqFt || body.ratePerSqFt || body.plotNumber)) {
      return NextResponse.json({ error: 'Forbidden: Only Admin can edit plot specifications' }, { status: 403 });
    }

    if (body.plotNumber && body.plotNumber !== currentPlot.plotNumber) {
      const existing = await Plot.findOne({
        projectId: currentPlot.projectId,
        plotNumber: body.plotNumber,
        _id: { $ne: id },
        isDeleted: { $ne: true },
      });
      if (existing) {
        return NextResponse.json({ error: 'Plot number already exists in this project' }, { status: 400 });
      }
    }

    const updateData = { ...body };
    if (updateData.sizeSqFt !== undefined || updateData.ratePerSqFt !== undefined) {
      const size = updateData.sizeSqFt !== undefined ? Number(updateData.sizeSqFt) : currentPlot.sizeSqFt;
      const rate = updateData.ratePerSqFt !== undefined ? Number(updateData.ratePerSqFt) : currentPlot.ratePerSqFt;
      updateData.totalPrice = size * rate;
    }

    const updated = await Plot.findByIdAndUpdate(id, updateData, { new: true })
      .populate('projectId', 'name code location totalAreaSqFt description status')
      .populate('createdBy', 'name email phone')
      .lean();

    return NextResponse.json({ success: true, plot: updated });
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
      return NextResponse.json({ error: 'Forbidden: Only Admin can delete plots' }, { status: 403 });
    }

    const resolvedParams = await Promise.resolve(params);
    const id = resolvedParams?.id;
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid plot ID' }, { status: 400 });
    }

    const plot = await Plot.findOne({ _id: id, isDeleted: { $ne: true } });
    if (!plot) return NextResponse.json({ error: 'Plot not found or already deleted' }, { status: 404 });

    // Soft delete plot
    await Plot.findByIdAndUpdate(id, {
      isDeleted: true,
      deletedAt: new Date(),
    });

    return NextResponse.json({ success: true, message: 'Plot deleted successfully (soft delete)' });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
