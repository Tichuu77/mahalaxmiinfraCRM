import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { connectDB } from '@/lib/db';
import User from '@/models/User';
import Role from '@/models/Role';
import Booking from '@/models/Booking';
import { getAuthUser } from '@/lib/auth';
import { getDownlineUserIds, isUserInDownline, getUplineChain } from '@/lib/hierarchy';

export const dynamic = 'force-dynamic';

export async function GET(req, { params }) {
  try {
    await connectDB();
    const currentUser = await getAuthUser(req);
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const resolvedParams = await Promise.resolve(params);
    const id = resolvedParams?.id;

    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid user ID' }, { status: 400 });
    }

    const targetUser = await User.findById(id)
      .populate('roleId')
      .populate({
        path: 'reportsTo',
        populate: { path: 'roleId' },
      })
      .select('-password')
      .lean();

    if (!targetUser || targetUser.isDeleted) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const isAdmin = currentUser.roleId?.isRoot || currentUser.roleId?.rank === 0;
    const isSelf = currentUser._id.toString() === id.toString();

    // Check visibility permissions:
    // Admin, self, downline of currentUser, or upline of currentUser can be viewed
    if (!isAdmin && !isSelf) {
      const inDownline = await isUserInDownline(currentUser._id, id);
      if (!inDownline) {
        const uplineOfCurrent = await getUplineChain(currentUser._id);
        const inUpline = uplineOfCurrent.some(
          (u) => u._id.toString() === id.toString()
        );
        if (!inUpline) {
          return NextResponse.json(
            { error: 'You do not have permission to view this user' },
            { status: 403 }
          );
        }
      }
    }

    // Fetch direct reports, upline chain, bookings metrics, and downline subtree in parallel
    const [
      directReports,
      uplineChain,
      bookingsCount,
      salesAgg,
      allDownlineIds,
    ] = await Promise.all([
      // 1. Direct reports
      User.find({ reportsTo: id, isDeleted: false })
        .populate('roleId')
        .select('-password')
        .sort({ name: 1 })
        .lean(),

      // 2. Upline breadcrumb trail
      getUplineChain(id),

      // 3. User performance metrics
      Booking.countDocuments({
        sellerId: id,
        status: { $ne: 'cancelled' },
      }),
      Booking.aggregate([
        {
          $match: {
            sellerId: new mongoose.Types.ObjectId(id),
            status: { $ne: 'cancelled' },
          },
        },
        { $group: { _id: null, total: { $sum: '$totalPlotValue' } } },
      ]),

      // 4. Recursive downline subtree
      getDownlineUserIds(id),
    ]);

    // Get direct reports count for each 1-downline member
    const reportIds = directReports.map((r) => r._id);
    let directReportsCountMap = {};
    if (reportIds.length > 0) {
      const directCounts = await User.aggregate([
        { $match: { reportsTo: { $in: reportIds }, isDeleted: false } },
        { $group: { _id: '$reportsTo', count: { $sum: 1 } } },
      ]);
      directCounts.forEach((c) => {
        directReportsCountMap[c._id.toString()] = c.count;
      });
    }

    const enrichedDirectReports = directReports.map((r) => ({
      ...r,
      directReportsCount: directReportsCountMap[r._id.toString()] || 0,
    }));

    // Reverse to get [Root, ..., GrandManager, DirectManager]
    const breadcrumbs = [...uplineChain].reverse();
    const totalSales = salesAgg[0]?.total || 0;

    return NextResponse.json({
      success: true,
      user: targetUser,
      directReports: enrichedDirectReports,
      breadcrumbs,
      stats: {
        directReportsCount: enrichedDirectReports.length,
        totalDownlineCount: allDownlineIds.length,
        bookingsCount,
        totalSales,
      },
    });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
