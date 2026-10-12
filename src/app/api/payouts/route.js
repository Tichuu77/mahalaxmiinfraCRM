import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import Payout from '@/models/Payout';
import Booking from '@/models/Booking';
import Incentive from '@/models/Incentive';
import User from '@/models/User';
import Plot from '@/models/Plot';
import Project from '@/models/Project';
import { getAuthUser } from '@/lib/auth';
import { getDownlineUserIds } from '@/lib/hierarchy';
import { dispatchNotification } from '@/lib/queue';

export const dynamic = 'force-dynamic';

export async function GET(req) {
  try {
    await connectDB();
    const user = await getAuthUser(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const isAdmin = user.roleId?.isRoot || user.roleId?.rank === 0;

    let filter = {};
    if (!isAdmin) {
      const downlineIds = await getDownlineUserIds(user._id);
      // Section 5: Own payouts, plus payouts tied to downline incentive records
      filter = {
        recipientId: { $in: [user._id, ...downlineIds] },
      };
    }

    const payouts = await Payout.find(filter)
      .populate('recipientId', 'name email phone roleId')
      .populate({
        path: 'bookingId',
        populate: [{ path: 'plotId' }, { path: 'projectId' }, { path: 'sellerId', select: 'name email phone' }],
      })
      .populate('incentiveId')
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json({ success: true, payouts });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(req) {
  try {
    await connectDB();
    const user = await getAuthUser(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { _id, status, paymentMode, transactionReference, remarks } = body;
    if (!_id) return NextResponse.json({ error: 'Payout _id is required' }, { status: 400 });

    const payout = await Payout.findById(_id)
      .populate('recipientId')
      .populate('bookingId');

    if (!payout) return NextResponse.json({ error: 'Payout record not found' }, { status: 404 });

    // Payout approval / disbursement authority
    const isAdmin = user.roleId?.isRoot || user.roleId?.rank === 0;
    if (!isAdmin && user.roleId?.rank > 1) {
      return NextResponse.json({ error: 'Only Admin or Director can approve or disburse payouts' }, { status: 403 });
    }

    if (paymentMode) payout.paymentMode = paymentMode;
    if (transactionReference) payout.transactionReference = transactionReference;
    if (remarks) payout.remarks = remarks;

    if (status && status !== payout.status) {
      payout.status = status;
      if (status === 'approved') {
        payout.approvedBy = user._id;
      } else if (status === 'paid') {
        payout.paidAt = new Date();

        // Section 6: When Payout Marked as Paid: notify recipient only with bill download link
        await dispatchNotification({
          recipientId: payout.recipientId._id,
          title: 'Payout Disbursed!',
          message: `Your commission of ₹${payout.amount.toLocaleString('en-IN')} has been disbursed. Bill #${payout.billNumber}.`,
          type: 'payout',
          link: `/api/payouts/${payout._id}/bill`,
        });
      }
    }

    await payout.save();

    const updated = await Payout.findById(_id)
      .populate('recipientId', 'name email phone roleId')
      .populate({
        path: 'bookingId',
        populate: [{ path: 'plotId' }, { path: 'projectId' }, { path: 'sellerId' }],
      })
      .populate('incentiveId');

    return NextResponse.json({ success: true, payout: updated });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
