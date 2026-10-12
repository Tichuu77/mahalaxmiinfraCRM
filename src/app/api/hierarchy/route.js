import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import User from '@/models/User';
import { getAuthUser } from '@/lib/auth';
import { getDownlineUserIds } from '@/lib/hierarchy';

export const dynamic = 'force-dynamic';

export async function GET(req) {
  try {
    await connectDB();
    const user = await getAuthUser(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const isAdmin = user.roleId?.isRoot || user.roleId?.rank === 0;

    // Collect all relevant users
    let users = [];
    if (isAdmin) {
      users = await User.find({ isDeleted: false })
        .populate('roleId')
        .populate('reportsTo', 'name email phone roleId')
        .select('-password')
        .lean();
    } else {
      const downlineIds = await getDownlineUserIds(user._id);
      users = await User.find({ _id: { $in: [user._id, ...downlineIds] }, isDeleted: false })
        .populate('roleId')
        .populate('reportsTo', 'name email phone roleId')
        .select('-password')
        .lean();
    }

    // Build hierarchical tree
    const userMap = {};
    users.forEach((u) => {
      userMap[u._id.toString()] = {
        ...u,
        children: [],
      };
    });

    let treeRoots = [];

    users.forEach((u) => {
      const node = userMap[u._id.toString()];
      const parentId = u.reportsTo?._id?.toString() || u.reportsTo?.toString();

      if (parentId && userMap[parentId]) {
        userMap[parentId].children.push(node);
      } else {
        // Root for this view
        treeRoots.push(node);
      }
    });

    return NextResponse.json({ success: true, tree: treeRoots, totalUsers: users.length });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
