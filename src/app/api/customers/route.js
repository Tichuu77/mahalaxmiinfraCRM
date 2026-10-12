import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import Customer from '@/models/Customer';
import Booking from '@/models/Booking';
import { getAuthUser } from '@/lib/auth';
import { buildDownlineFilter, isUserInDownline } from '@/lib/hierarchy';
import { CustomerSchema } from '@/lib/validations';

export const dynamic = 'force-dynamic';

export async function GET(req) {
  try {
    await connectDB();
    const user = await getAuthUser(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (id) {
      const customer = await Customer.findById(id).populate('createdBy', 'name email phone').lean();
      if (!customer) return NextResponse.json({ error: 'Customer not found' }, { status: 404 });

      const bookings = await Booking.find({ customerId: id })
        .populate('plotId', 'plotNumber sizeSqFt ratePerSqFt totalPrice')
        .populate('projectId', 'name code location')
        .populate('sellerId', 'name email phone')
        .sort({ createdAt: -1 })
        .lean();

      return NextResponse.json({ success: true, customer, bookings });
    }

    // Enforce downline scope: user sees customers created by self or anyone in their downline
    const filter = await buildDownlineFilter(user, 'createdBy');

    const customers = await Customer.find(filter)
      .populate('createdBy', 'name email phone')
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json({ success: true, customers });
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
    const validated = CustomerSchema.parse(body);

    const customer = await Customer.create({
      ...validated,
      createdBy: user._id,
    });

    const populated = await Customer.findById(customer._id).populate('createdBy', 'name email phone');
    return NextResponse.json({ success: true, customer: populated });
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
    const { _id, ...updateData } = body;
    if (!_id) return NextResponse.json({ error: 'Customer _id is required' }, { status: 400 });

    const existingCustomer = await Customer.findById(_id);
    if (!existingCustomer) return NextResponse.json({ error: 'Customer not found' }, { status: 404 });

    const isAdmin = user.roleId?.isRoot || user.roleId?.rank === 0;
    if (!isAdmin && !existingCustomer.createdBy.equals(user._id)) {
      const inDownline = await isUserInDownline(user._id, existingCustomer.createdBy);
      if (!inDownline) {
        return NextResponse.json({ error: 'Permission denied: Cannot edit customer outside your downline' }, { status: 403 });
      }
    }

    const validated = CustomerSchema.parse({
      name: updateData.name ?? existingCustomer.name,
      phone: updateData.phone ?? existingCustomer.phone,
      email: updateData.email !== undefined ? updateData.email : existingCustomer.email,
      address: updateData.address !== undefined ? updateData.address : existingCustomer.address,
      city: updateData.city !== undefined ? updateData.city : existingCustomer.city,
      panNumber: updateData.panNumber !== undefined ? updateData.panNumber : existingCustomer.panNumber,
      aadhaarNumber: updateData.aadhaarNumber ?? existingCustomer.aadhaarNumber,
    });

    const updated = await Customer.findByIdAndUpdate(_id, validated, { new: true }).populate('createdBy', 'name email phone');
    return NextResponse.json({ success: true, customer: updated });
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
    let targetId = searchParams.get('id');
    if (!targetId) {
      try {
        const body = await req.json();
        targetId = body?.id || body?._id;
      } catch (e) {}
    }

    if (!targetId) return NextResponse.json({ error: 'Customer ID is required' }, { status: 400 });

    const customer = await Customer.findById(targetId);
    if (!customer) return NextResponse.json({ error: 'Customer not found' }, { status: 404 });

    const isAdmin = user.roleId?.isRoot || user.roleId?.rank === 0;
    if (!isAdmin && !customer.createdBy.equals(user._id)) {
      const inDownline = await isUserInDownline(user._id, customer.createdBy);
      if (!inDownline) {
        return NextResponse.json({ error: 'Permission denied: Cannot delete customer outside your downline' }, { status: 403 });
      }
    }

    const bookingsCount = await Booking.countDocuments({ customerId: targetId });
    if (bookingsCount > 0) {
      return NextResponse.json(
        { error: `Cannot delete customer: ${bookingsCount} booking(s) associated with this customer. Delete or reassign bookings first.` },
        { status: 400 }
      );
    }

    await Customer.findByIdAndDelete(targetId);
    return NextResponse.json({ success: true, message: 'Customer deleted successfully' });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
