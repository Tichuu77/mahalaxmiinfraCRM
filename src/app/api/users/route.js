import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import User from '@/models/User';
import Role from '@/models/Role';
import { getAuthUser, hashPassword, clearAuthCache } from '@/lib/auth';
import { getDownlineUserIds, isUserInDownline, validateHierarchyCreation } from '@/lib/hierarchy';
import { UserCreateSchema, UserUpdateSchema } from '@/lib/validations';

export const dynamic = 'force-dynamic';

export async function GET(req) {
  try {
    await connectDB();
    const user = await getAuthUser(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const isAdmin = user.roleId?.isRoot || user.roleId?.rank === 0;

    let query = { isDeleted: false };
    if (!isAdmin) {
      const downlineIds = await getDownlineUserIds(user._id);
      // Return self + downline
      query._id = { $in: [user._id, ...downlineIds] };
    }

    const users = await User.find(query)
      .populate('roleId')
      .populate('reportsTo', 'name email phone roleId')
      .select('-password')
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json({ success: true, users });
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
    const validated = UserCreateSchema.parse(body);

    const targetRole = await Role.findById(validated.roleId);
    if (!targetRole) {
      return NextResponse.json({ error: 'Target role not found' }, { status: 404 });
    }

    // Validate hierarchy authority: can only create user at a rank below their own
    const authCheck = validateHierarchyCreation(user, targetRole);
    if (!authCheck.allowed) {
      return NextResponse.json({ error: authCheck.error }, { status: 403 });
    }

    // Determine reportsTo
    // By default, if not specified or user is not Admin, user automatically reports to the creator
    // If reportsTo is specified, it must be either the creator or someone in creator's downline (or Admin can set anyone)
    let reportsToId = user._id;
    if (validated.reportsTo) {
      if (user.roleId?.isRoot || user.roleId?.rank === 0) {
        reportsToId = validated.reportsTo;
      } else {
        const isInDownline = await isUserInDownline(user._id, validated.reportsTo);
        if (validated.reportsTo.toString() === user._id.toString() || isInDownline) {
          reportsToId = validated.reportsTo;
        } else {
          return NextResponse.json({ error: 'Assigned manager must be yourself or within your downline' }, { status: 403 });
        }
      }
    }

    const existingEmail = await User.findOne({ email: validated.email.toLowerCase() });
    if (existingEmail) {
      return NextResponse.json({ error: 'User with this email already exists' }, { status: 400 });
    }

    const hashedPassword = await hashPassword(validated.password);

    const newUser = await User.create({
      name: validated.name,
      email: validated.email.toLowerCase(),
      phone: validated.phone,
      password: hashedPassword,
      roleId: targetRole._id,
      reportsTo: reportsToId,
      status: 'active',
    });

    const populated = await User.findById(newUser._id)
      .populate('roleId')
      .populate('reportsTo', 'name email phone')
      .select('-password')
      .lean();

    return NextResponse.json({ success: true, user: populated });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}

export async function PUT(req) {
  try {
    await connectDB();
    const user = await getAuthUser(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { _id, ...rawData } = body;
    if (!_id) return NextResponse.json({ error: 'User _id is required' }, { status: 400 });

    const targetUser = await User.findById(_id).populate('roleId');
    if (!targetUser) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    const isAdmin = user.roleId?.isRoot || user.roleId?.rank === 0;
    const isSelf = user._id.toString() === targetUser._id.toString();

    // Check downline authorization
    if (!isAdmin && !isSelf) {
      const inDownline = await isUserInDownline(user._id, targetUser._id);
      if (!inDownline) {
        return NextResponse.json({ error: 'You can only edit users within your own downline' }, { status: 403 });
      }
    }

    const validated = UserUpdateSchema.parse(rawData);

    // Email uniqueness check
    if (validated.email && validated.email.toLowerCase() !== targetUser.email.toLowerCase()) {
      const existingEmail = await User.findOne({
        email: validated.email.toLowerCase(),
        _id: { $ne: targetUser._id },
      });
      if (existingEmail) {
        return NextResponse.json({ error: 'A user with this email address already exists' }, { status: 400 });
      }
      validated.email = validated.email.toLowerCase();
    }

    // Role authority check
    if (validated.roleId) {
      const newRole = await Role.findById(validated.roleId);
      if (!newRole) {
        return NextResponse.json({ error: 'Target role not found' }, { status: 404 });
      }
      if (!isAdmin && newRole.rank <= (user.roleId?.rank ?? 999)) {
        return NextResponse.json({
          error: `Cannot assign role "${newRole.name}". You can only assign roles subordinate to your own role in the hierarchy.`,
        }, { status: 403 });
      }
    }

    // Manager (reportsTo) assignment check
    if (validated.reportsTo !== undefined) {
      if (!validated.reportsTo) {
        const isTargetRoot = targetUser.roleId?.isRoot || targetUser.roleId?.rank === 0;
        if (isTargetRoot || isAdmin) {
          validated.reportsTo = null;
        } else {
          return NextResponse.json({ error: 'Only root administrators can have no direct manager' }, { status: 400 });
        }
      } else {
        if (validated.reportsTo.toString() === targetUser._id.toString()) {
          return NextResponse.json({ error: 'A user cannot report to themselves' }, { status: 400 });
        }

        const isSubordinate = await isUserInDownline(targetUser._id, validated.reportsTo);
        if (isSubordinate) {
          return NextResponse.json({
            error: 'Cannot assign a manager who is currently in this user\'s downline (prevents circular loops)',
          }, { status: 400 });
        }

        if (!isAdmin) {
          const isActingDownline = await isUserInDownline(user._id, validated.reportsTo);
          const isSelfActing = validated.reportsTo.toString() === user._id.toString();
          if (!isSelfActing && !isActingDownline) {
            return NextResponse.json({
              error: 'Assigned manager must be yourself or someone within your downline',
            }, { status: 403 });
          }
        }
      }
    }

    // If password update requested
    if (validated.password) {
      validated.password = await hashPassword(validated.password);
    } else {
      delete validated.password;
    }

    const updatedUser = await User.findByIdAndUpdate(_id, { $set: validated }, { new: true })
      .populate('roleId')
      .populate('reportsTo', 'name email phone roleId')
      .select('-password')
      .lean();

    clearAuthCache(_id);

    return NextResponse.json({ success: true, user: updatedUser });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}

export async function DELETE(req) {
  try {
    await connectDB();
    const user = await getAuthUser(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const targetId = searchParams.get('id');
    if (!targetId) return NextResponse.json({ error: 'User ID is required' }, { status: 400 });

    const targetUser = await User.findById(targetId);
    if (!targetUser) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    const isAdmin = user.roleId?.isRoot || user.roleId?.rank === 0;
    if (!isAdmin) {
      const inDownline = await isUserInDownline(user._id, targetId);
      if (!inDownline) {
        return NextResponse.json({ error: 'You can only soft-delete users within your own downline' }, { status: 403 });
      }
    }

    // Soft delete
    targetUser.isDeleted = true;
    targetUser.status = 'inactive';
    await targetUser.save();

    clearAuthCache(targetId);

    return NextResponse.json({ success: true, message: 'User soft-deleted successfully' });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
