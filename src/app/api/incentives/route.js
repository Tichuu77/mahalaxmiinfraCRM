import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import Incentive from '@/models/Incentive';
import Booking from '@/models/Booking';
import User from '@/models/User';
import Role from '@/models/Role';
import Plot from '@/models/Plot';
import Customer from '@/models/Customer';
import { getAuthUser } from '@/lib/auth';
import { getDownlineUserIds } from '@/lib/hierarchy';
import { processIncentiveApproval } from '@/lib/incentiveEngine';
import { ApprovalActionSchema } from '@/lib/validations';

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
      const relevantUserIds = [user._id, ...downlineIds];

      // Section 5: Own incentive records, plus override shares earned from downline sales, plus pending approval for this user
      filter = {
        $or: [
          { recipientId: { $in: relevantUserIds } },
          { currentApproverId: user._id },
        ],
      };
    }

    const incentives = await Incentive.find(filter)
      .populate('recipientId', 'name email phone roleId')
      .populate('roleId')
      .populate({
        path: 'bookingId',
        populate: [
          { path: 'plotId' },
          { path: 'projectId' },
          { path: 'customerId' },
          { path: 'sellerId', select: 'name email phone' },
        ],
      })
      .populate('currentApproverId', 'name email phone')
      .populate('approvalChain.approverId', 'name email phone')
      .sort({ createdAt: -1 })
      .lean();

    // Separate pending approvals waiting specifically on this user
    const pendingMyApproval = incentives.filter(
      (inc) => inc.status === 'submitted' && (inc.currentApproverId?._id?.toString() === user._id.toString() || (isAdmin && inc.currentApproverId))
    );

    return NextResponse.json({ success: true, incentives, pendingMyApproval });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    await connectDB();
    const user = await getAuthUser(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const validated = ApprovalActionSchema.parse(body);

    const result = await processIncentiveApproval({
      bookingId: validated.bookingId,
      approverUser: user,
      decision: validated.decision,
      comments: validated.comments || '',
    });

    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
