import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import User from '@/models/User';
import Role from '@/models/Role';
import { comparePassword, signToken } from '@/lib/auth';
import { LoginSchema } from '@/lib/validations';

export async function POST(req) {
  try {
    await connectDB();
    const body = await req.json();
    const validated = LoginSchema.parse(body);

    const user = await User.findOne({ email: validated.email.toLowerCase(), isDeleted: false })
      .populate('roleId')
      .populate('reportsTo', 'name email phone');

    if (!user) {
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
    }

    if (user.status !== 'active') {
      return NextResponse.json({ error: 'Your account is deactivated. Please contact your manager or admin.' }, { status: 403 });
    }

    const isValid = await comparePassword(validated.password, user.password);
    if (!isValid) {
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
    }

    const token = signToken({
      userId: user._id,
      email: user.email,
      rank: user.roleId?.rank,
    });

    const userObj = user.toObject();
    delete userObj.password;

    const response = NextResponse.json({
      success: true,
      token,
      user: userObj,
    });

    response.cookies.set('token', token, {
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60,
    });

    return response;
  } catch (error) {
    console.error('[API Login] error:', error);
    return NextResponse.json({ error: error.message || 'Login failed' }, { status: 400 });
  }
}
