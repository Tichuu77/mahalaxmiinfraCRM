import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import Booking from '@/models/Booking';
import Plot from '@/models/Plot';
import Project from '@/models/Project';
import Customer from '@/models/Customer';
import User from '@/models/User';
import Role from '@/models/Role';
import { getAuthUser } from '@/lib/auth';
import { buildDownlineFilter, getUplineChain } from '@/lib/hierarchy';
import { BookingSchema } from '@/lib/validations';
import { dispatchIncentiveCalculation, dispatchNotification } from '@/lib/queue';
import { voidIncentivesForBooking } from '@/lib/incentiveEngine';
import { invalidateCache } from '@/lib/cache';

export const dynamic = 'force-dynamic';

export async function GET(req) {
  try {
    await connectDB();
    const user = await getAuthUser(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const filter = await buildDownlineFilter(user, 'sellerId');

    const bookings = await Booking.find(filter)
      .populate('plotId')
      .populate('projectId')
      .populate('customerId')
      .populate('sellerId', 'name email phone roleId')
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json({ success: true, bookings });
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
    const validated = BookingSchema.parse(body);

    const plot = await Plot.findById(validated.plotId);
    if (!plot || plot.isDeleted) return NextResponse.json({ error: 'Plot not found or deleted' }, { status: 404 });

    if (plot.status !== 'available') {
      return NextResponse.json({ error: `Plot is already ${plot.status}` }, { status: 400 });
    }

    const project = await Project.findById(validated.projectId);
    const customer = await Customer.findById(validated.customerId);

    if (!project || project.isDeleted || !customer) {
      return NextResponse.json({ error: 'Project or Customer invalid or deleted' }, { status: 400 });
    }

    const bookingNumber = `BK-${project.code}-${plot.plotNumber}-${Math.floor(1000 + Math.random() * 9000)}`;

    // Mark plot as booked
    plot.status = 'booked';
    await plot.save();

    // Any user at any level can directly book (sell) a plot!
    const booking = await Booking.create({
      bookingNumber,
      plotId: plot._id,
      projectId: project._id,
      customerId: customer._id,
      sellerId: user._id, // Direct seller is the logged in user
      bookingAmount: validated.bookingAmount,
      totalPlotValue: plot.totalPrice,
      paymentMode: validated.paymentMode,
      transactionReference: validated.transactionReference || '',
      notes: validated.notes || '',
      status: 'pending', // Starts in pending, activated once payment cleared
      createdBy: user._id,
    });

    // Notify ancestor chain of new booking creation
    const upline = await getUplineChain(user._id);
    for (const ancestor of upline) {
      await dispatchNotification({
        recipientId: ancestor._id,
        title: 'New Booking Created',
        message: `${user.name} created a new booking #${bookingNumber} for Plot ${plot.plotNumber} in ${project.name}.`,
        type: 'booking',
        link: '/dashboard/bookings',
      });
    }

    const populated = await Booking.findById(booking._id)
      .populate('plotId')
      .populate('projectId')
      .populate('customerId')
      .populate('sellerId', 'name email phone roleId');

    invalidateCache('projects');
    invalidateCache('dashboard');

    return NextResponse.json({ success: true, booking: populated });
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
    const { _id, status, notes } = body;
    if (!_id) return NextResponse.json({ error: 'Booking _id is required' }, { status: 400 });

    const booking = await Booking.findById(_id)
      .populate('plotId')
      .populate('projectId')
      .populate('customerId')
      .populate('sellerId');

    if (!booking) return NextResponse.json({ error: 'Booking not found' }, { status: 404 });

    const previousStatus = booking.status;

    if (notes) booking.notes = notes;

    if (status && status !== previousStatus) {
      booking.status = status;

      if (status === 'active') {
        booking.activatedAt = new Date();
        await booking.save();

        // Section 4.1: Incentive records are automatically created when a Booking status changes to Active.
        await dispatchIncentiveCalculation(booking._id);
      } else if (status === 'cancelled') {
        await booking.save();

        // Release plot
        await Plot.findByIdAndUpdate(booking.plotId._id, { status: 'available' });

        // Section 4.1: If the booking is cancelled, all associated incentive records are voided.
        await voidIncentivesForBooking(booking._id);

        // Notify upline
        const upline = await getUplineChain(booking.sellerId._id);
        for (const ancestor of upline) {
          await dispatchNotification({
            recipientId: ancestor._id,
            title: 'Booking Cancelled',
            message: `Booking #${booking.bookingNumber} for Plot ${booking.plotId?.plotNumber} was cancelled and incentives voided.`,
            type: 'booking',
            link: '/dashboard/bookings',
          });
        }
      } else {
        await booking.save();
      }
    }

    const updated = await Booking.findById(_id)
      .populate('plotId')
      .populate('projectId')
      .populate('customerId')
      .populate('sellerId', 'name email phone roleId');

    invalidateCache('projects');
    invalidateCache('dashboard');

    return NextResponse.json({ success: true, booking: updated });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
