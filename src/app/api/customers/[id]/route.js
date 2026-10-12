import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { connectDB } from '@/lib/db';
import Customer from '@/models/Customer';
import Booking from '@/models/Booking';
import { getAuthUser } from '@/lib/auth';
import { isUserInDownline } from '@/lib/hierarchy';
import { CustomerSchema } from '@/lib/validations';

export const dynamic = 'force-dynamic';

export async function GET(req, { params }) {
  try {
    await connectDB();
    const user = await getAuthUser(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const resolvedParams = await Promise.resolve(params);
    const id = resolvedParams?.id;
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid customer ID' }, { status: 400 });
    }

    const customer = await Customer.findById(id).populate('createdBy', 'name email phone').lean();
    if (!customer) return NextResponse.json({ error: 'Customer not found' }, { status: 404 });

    const bookings = await Booking.find({ customerId: id })
      .populate('plotId', 'plotNumber sizeSqFt ratePerSqFt totalPrice')
      .populate('projectId', 'name code location')
      .populate('sellerId', 'name email phone')
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json({ success: true, customer, bookings });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(req, { params }) {
  try {
    await connectDB();
    const user = await getAuthUser(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const resolvedParams = await Promise.resolve(params);
    const id = resolvedParams?.id;
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid customer ID' }, { status: 400 });
    }

    const existingCustomer = await Customer.findById(id);
    if (!existingCustomer) return NextResponse.json({ error: 'Customer not found' }, { status: 404 });

    const isAdmin = user.roleId?.isRoot || user.roleId?.rank === 0;
    if (!isAdmin && !existingCustomer.createdBy.equals(user._id)) {
      const inDownline = await isUserInDownline(user._id, existingCustomer.createdBy);
      if (!inDownline) {
        return NextResponse.json({ error: 'Permission denied: Cannot edit customer outside your downline' }, { status: 403 });
      }
    }

    const body = await req.json();
    const validated = CustomerSchema.parse({
      name: body.name ?? existingCustomer.name,
      phone: body.phone ?? existingCustomer.phone,
      email: body.email !== undefined ? body.email : existingCustomer.email,
      address: body.address !== undefined ? body.address : existingCustomer.address,
      city: body.city !== undefined ? body.city : existingCustomer.city,
      panNumber: body.panNumber !== undefined ? body.panNumber : existingCustomer.panNumber,
      aadhaarNumber: body.aadhaarNumber ?? existingCustomer.aadhaarNumber,
    });

    const updated = await Customer.findByIdAndUpdate(id, validated, { new: true }).populate('createdBy', 'name email phone');
    return NextResponse.json({ success: true, customer: updated });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}

export async function DELETE(req, { params }) {
  try {
    await connectDB();
    const user = await getAuthUser(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const resolvedParams = await Promise.resolve(params);
    const id = resolvedParams?.id;
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid customer ID' }, { status: 400 });
    }

    const customer = await Customer.findById(id);
    if (!customer) return NextResponse.json({ error: 'Customer not found' }, { status: 404 });

    const isAdmin = user.roleId?.isRoot || user.roleId?.rank === 0;
    if (!isAdmin && !customer.createdBy.equals(user._id)) {
      const inDownline = await isUserInDownline(user._id, customer.createdBy);
      if (!inDownline) {
        return NextResponse.json({ error: 'Permission denied: Cannot delete customer outside your downline' }, { status: 403 });
      }
    }

    const bookingsCount = await Booking.countDocuments({ customerId: id });
    if (bookingsCount > 0) {
      return NextResponse.json(
        { error: `Cannot delete customer: ${bookingsCount} booking(s) associated with this customer. Delete or reassign bookings first.` },
        { status: 400 }
      );
    }

    await Customer.findByIdAndDelete(id);
    return NextResponse.json({ success: true, message: 'Customer deleted successfully' });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
