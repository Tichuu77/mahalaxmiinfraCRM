import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import Project from '@/models/Project';
import Plot from '@/models/Plot';
import Booking from '@/models/Booking';
import Customer from '@/models/Customer';
import Registry from '@/models/Registry';
import Incentive from '@/models/Incentive';
import Payout from '@/models/Payout';
import User from '@/models/User';
import { getAuthUser } from '@/lib/auth';
import { getDownlineUserIds } from '@/lib/hierarchy';
import { getCached } from '@/lib/cache';

export const dynamic = 'force-dynamic';

export async function GET(req) {
  try {
    await connectDB();
    const user = await getAuthUser(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const dashboardData = await getCached(`dashboard:${user._id}`, 10000, async () => {
      const isAdmin = user.roleId?.isRoot || user.roleId?.rank === 0;

    // Determine downline user IDs
    let downlineIds = [];
    let downlineScopeFilter = {};

    if (!isAdmin) {
      downlineIds = await getDownlineUserIds(user._id);
      const scopedUserIds = [user._id, ...downlineIds];
      downlineScopeFilter = { sellerId: { $in: scopedUserIds } };
    }

    // 4. Pending Approvals for current user filter
    let pendingApprovalFilter = { status: 'submitted' };
    if (!isAdmin) {
      pendingApprovalFilter.currentApproverId = user._id;
    }

    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
    sixMonthsAgo.setDate(1);

    // Execute ALL dashboard metrics concurrently in parallel via Promise.all
    const [
      totalProjects,
      plotStatusAgg,
      totalBookings,
      activeBookings,
      totalRegistries,
      revenueResult,
      pendingApprovalsCount,
      personalEarningsResult,
      personalPaidResult,
      teamPerformers,
      projectAggregation,
      monthlyBookings,
      recentBookings,
    ] = await Promise.all([
      // 1. Group-wide shared metrics
      Project.countDocuments({ isDeleted: { $ne: true } }),
      Plot.aggregate([
        { $match: { isDeleted: { $ne: true } } },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),

      // 2. Scoped Bookings & Registries
      Booking.countDocuments(downlineScopeFilter),
      Booking.countDocuments({ ...downlineScopeFilter, status: 'active' }),
      Registry.countDocuments(downlineScopeFilter),

      // 3. Scoped Revenue
      Booking.aggregate([
        { $match: { ...downlineScopeFilter, status: { $in: ['active', 'registry'] } } },
        { $group: { _id: null, totalRevenue: { $sum: '$totalPlotValue' }, totalCollected: { $sum: '$bookingAmount' } } },
      ]),

      // 4. Pending Approvals
      Incentive.countDocuments(pendingApprovalFilter),

      // 5. User's Personal Earnings (Incentives & Payouts)
      Incentive.aggregate([
        { $match: { recipientId: user._id, status: 'approved' } },
        { $group: { _id: null, totalApproved: { $sum: '$amount' } } },
      ]),
      Payout.aggregate([
        { $match: { recipientId: user._id, status: 'paid' } },
        { $group: { _id: null, totalPaid: { $sum: '$amount' } } },
      ]),

      // 6. Top Performers Board in user's downline
      Booking.aggregate([
        { $match: { ...downlineScopeFilter, status: { $in: ['active', 'registry'] } } },
        {
          $group: {
            _id: '$sellerId',
            totalSales: { $sum: '$totalPlotValue' },
            bookingsCount: { $sum: 1 },
          },
        },
        { $sort: { totalSales: -1 } },
        { $limit: 5 },
        {
          $lookup: {
            from: 'users',
            localField: '_id',
            foreignField: '_id',
            as: 'sellerInfo',
          },
        },
        { $unwind: '$sellerInfo' },
        {
          $lookup: {
            from: 'roles',
            localField: 'sellerInfo.roleId',
            foreignField: '_id',
            as: 'roleInfo',
          },
        },
        { $unwind: '$roleInfo' },
        {
          $project: {
            _id: 1,
            totalSales: 1,
            bookingsCount: 1,
            name: '$sellerInfo.name',
            email: '$sellerInfo.email',
            roleName: '$roleInfo.name',
            rank: '$roleInfo.rank',
          },
        },
      ]),

      // 7. Project-wise performance breakdown
      Booking.aggregate([
        { $match: { ...downlineScopeFilter, status: { $in: ['active', 'registry'] } } },
        {
          $group: {
            _id: '$projectId',
            totalRevenue: { $sum: '$totalPlotValue' },
            totalCollected: { $sum: '$bookingAmount' },
            bookingsCount: { $sum: 1 },
          },
        },
        {
          $lookup: {
            from: 'projects',
            localField: '_id',
            foreignField: '_id',
            as: 'projectInfo',
          },
        },
        { $unwind: '$projectInfo' },
        {
          $project: {
            _id: 1,
            name: '$projectInfo.name',
            code: '$projectInfo.code',
            totalRevenue: 1,
            totalCollected: 1,
            bookingsCount: 1,
          },
        },
        { $sort: { totalRevenue: -1 } },
      ]),

      // 8. Monthly Sales & Collection Trend
      Booking.aggregate([
        {
          $match: {
            ...downlineScopeFilter,
            status: { $in: ['active', 'registry', 'pending'] },
            createdAt: { $gte: sixMonthsAgo },
          },
        },
        {
          $group: {
            _id: {
              year: { $year: '$createdAt' },
              month: { $month: '$createdAt' },
            },
            revenue: { $sum: '$totalPlotValue' },
            collected: { $sum: '$bookingAmount' },
            bookings: { $sum: 1 },
          },
        },
      ]),

      // 9. Recent Scoped Activity / Bookings
      Booking.find(downlineScopeFilter)
        .populate('plotId', 'plotNumber sizeSqFt')
        .populate('projectId', 'name code')
        .populate('customerId', 'name phone')
        .populate('sellerId', 'name email')
        .sort({ createdAt: -1 })
        .limit(6)
        .lean(),
    ]);

    // Parse plot status aggregation
    let totalPlots = 0;
    let availablePlots = 0;
    let bookedPlots = 0;
    let registeredPlots = 0;

    plotStatusAgg.forEach(({ _id: status, count }) => {
      totalPlots += count;
      if (status === 'available') availablePlots = count;
      else if (status === 'booked') bookedPlots = count;
      else if (status === 'registered') registeredPlots = count;
    });

    const totalRevenue = revenueResult[0]?.totalRevenue || 0;
    const totalCollected = revenueResult[0]?.totalCollected || 0;
    const totalApprovedEarnings = personalEarningsResult[0]?.totalApproved || 0;
    const totalPaidEarnings = personalPaidResult[0]?.totalPaid || 0;

    // Plot distribution breakdown for charts
    const plotDistribution = [
      { name: 'Available', value: availablePlots, color: '#10b981' },
      { name: 'Booked', value: bookedPlots, color: '#f59e0b' },
      { name: 'Registered', value: registeredPlots, color: '#3b82f6' },
    ];

    // Build 6-month trend array
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const now = new Date();
    const monthlyTrendMap = new Map();

    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${d.getMonth() + 1}`;
      monthlyTrendMap.set(key, {
        month: monthNames[d.getMonth()],
        period: `${monthNames[d.getMonth()]} ${d.getFullYear() % 100}`,
        revenue: 0,
        collected: 0,
        bookings: 0,
      });
    }

    monthlyBookings.forEach((b) => {
      const key = `${b._id.year}-${b._id.month}`;
      if (monthlyTrendMap.has(key)) {
        const item = monthlyTrendMap.get(key);
        item.revenue = b.revenue;
        item.collected = b.collected;
        item.bookings = b.bookings;
      }
    });

    const monthlyTrend = Array.from(monthlyTrendMap.values());

      return {
        kpi: {
          totalProjects,
          totalPlots,
          availablePlots,
          bookedPlots,
          registeredPlots,
          totalBookings,
          activeBookings,
          totalRegistries,
          totalRevenue,
          totalCollected,
          pendingApprovalsCount,
          myApprovedEarnings: totalApprovedEarnings,
          myPaidEarnings: totalPaidEarnings,
          downlineTeamSize: downlineIds.length,
        },
        plotDistribution,
        projectDistribution: projectAggregation,
        monthlyTrend,
        teamPerformers,
        recentBookings,
      };
    });

    return NextResponse.json({
      success: true,
      ...dashboardData,
    });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
