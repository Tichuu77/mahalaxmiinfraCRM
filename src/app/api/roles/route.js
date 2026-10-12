import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import Role from '@/models/Role';
import { getAuthUser } from '@/lib/auth';
import { RoleSchema } from '@/lib/validations';
import { getCached, invalidateCache } from '@/lib/cache';

export const dynamic = 'force-dynamic';

export async function GET(req) {
  try {
    const user = await getAuthUser(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const roles = await getCached('roles:all', 30000, async () => {
      await connectDB();
      return Role.find().sort({ rank: 1 }).lean();
    });

    return NextResponse.json({ success: true, roles });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    await connectDB();
    const user = await getAuthUser(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // Section 2.1: Admin manages the role list from System Settings
    if (!user.roleId?.isRoot && user.roleId?.rank !== 0) {
      return NextResponse.json({ error: 'Forbidden: Only Admin can create roles' }, { status: 403 });
    }

    const body = await req.json();
    const validated = RoleSchema.parse(body);

    const existing = await Role.findOne({ name: validated.name });
    if (existing) {
      return NextResponse.json({ error: 'Role with this name already exists' }, { status: 400 });
    }

    const role = await Role.create({
      ...validated,
      createdBy: user._id,
    });

    invalidateCache('roles');

    return NextResponse.json({ success: true, role });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}

export async function PUT(req) {
  try {
    await connectDB();
    const user = await getAuthUser(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    if (!user.roleId?.isRoot && user.roleId?.rank !== 0) {
      return NextResponse.json({ error: 'Forbidden: Only Admin can update roles' }, { status: 403 });
    }

    const body = await req.json();
    const { _id, ...updateData } = body;
    if (!_id) return NextResponse.json({ error: 'Role _id is required' }, { status: 400 });

    const role = await Role.findByIdAndUpdate(_id, updateData, { new: true, runValidators: true });
    invalidateCache('roles');
    return NextResponse.json({ success: true, role });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
