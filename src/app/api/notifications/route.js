import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import Notification from '@/models/Notification';
import { getAuthUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(req) {
  try {
    await connectDB();
    const user = await getAuthUser(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const [notifications, unreadCount] = await Promise.all([
      Notification.find({ recipientId: user._id })
        .sort({ createdAt: -1 })
        .limit(30)
        .lean(),
      Notification.countDocuments({ recipientId: user._id, isRead: false }),
    ]);

    return NextResponse.json({ success: true, notifications, unreadCount });
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
    if (body.all) {
      await Notification.updateMany({ recipientId: user._id, isRead: false }, { isRead: true });
    } else if (body.id) {
      await Notification.findByIdAndUpdate(body.id, { isRead: true });
    }

    return NextResponse.json({ success: true, message: 'Notifications updated' });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
