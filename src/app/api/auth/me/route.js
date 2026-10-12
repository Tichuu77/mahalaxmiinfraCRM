import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(req) {
  try {
    const user = await getAuthUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userObj = { ...user };
    delete userObj.password;

    return NextResponse.json({ success: true, user: userObj });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
