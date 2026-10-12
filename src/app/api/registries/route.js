import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import Registry from '@/models/Registry';
import Booking from '@/models/Booking';
import Plot from '@/models/Plot';
import Customer from '@/models/Customer';
import User from '@/models/User';
import { getAuthUser } from '@/lib/auth';
import { buildDownlineFilter, getUplineChain } from '@/lib/hierarchy';
import { RegistrySchema } from '@/lib/validations';
import { dispatchNotification } from '@/lib/queue';

export const dynamic = 'force-dynamic';

export async function GET(req) {
  try {
    await connectDB();
    const user = await getAuthUser(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const filter = await buildDownlineFilter(user, 'sellerId');

    const registries = await Registry.find(filter)
      .populate('plotId')
      .populate('customerId')
      .populate('sellerId', 'name email phone')
      .populate({
        path: 'bookingId',
        populate: [{ path: 'projectId' }],
      })
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json({ success: true, registries });
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
    const validated = RegistrySchema.parse(body);

    const booking = await Booking.findById(validated.bookingId)
      .populate('plotId')
      .populate('customerId')
      .populate('sellerId');

    if (!booking) return NextResponse.json({ error: 'Booking not found' }, { status: 404 });

    const existing = await Registry.findOne({ bookingId: booking._id });
    if (existing) return NextResponse.json({ error: 'Registry record already exists for this booking' }, { status: 400 });

    const registry = await Registry.create({
      bookingId: booking._id,
      plotId: booking.plotId._id,
      customerId: booking.customerId._id,
      sellerId: booking.sellerId._id,
      registryNumber: validated.registryNumber,
      registryDate: new Date(validated.registryDate),
      registryOffice: validated.registryOffice || '',
      stampDutyAmount: validated.stampDutyAmount || 0,
      remarks: validated.remarks || '',
      status: 'pending',
      createdBy: user._id,
    });

    const populated = await Registry.findById(registry._id)
      .populate('plotId')
      .populate('customerId')
      .populate('sellerId', 'name email phone');

    return NextResponse.json({ success: true, registry: populated });
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
    const { _id, status, remarks } = body;
    if (!_id) return NextResponse.json({ error: 'Registry _id is required' }, { status: 400 });

    const registry = await Registry.findById(_id)
      .populate('plotId')
      .populate('customerId')
      .populate('bookingId')
      .populate('sellerId');

    if (!registry) return NextResponse.json({ error: 'Registry not found' }, { status: 404 });

    if (remarks !== undefined) registry.remarks = remarks;

    if (status && status !== registry.status) {
      registry.status = status;

      if (status === 'completed') {
        // Update Plot to 'registered'
        await Plot.findByIdAndUpdate(registry.plotId._id, { status: 'registered' });

        // Update Booking status to 'registry'
        await Booking.findByIdAndUpdate(registry.bookingId._id, { status: 'registry' });

        // Section 6: When Registry Completed: notify Booking creator + entire upline to Admin
        const upline = await getUplineChain(registry.sellerId._id);
        const notifyList = [registry.sellerId, ...upline];

        for (const recipient of notifyList) {
          await dispatchNotification({
            recipientId: recipient._id,
            title: 'Registry Completed!',
            message: `Plot ${registry.plotId?.plotNumber} registry #${registry.registryNumber} is successfully completed!`,
            type: 'registry',
            link: '/dashboard/registries',
          });
        }
      }

      await registry.save();
    }

    const updated = await Registry.findById(_id)
      .populate('plotId')
      .populate('customerId')
      .populate('sellerId', 'name email phone');

    return NextResponse.json({ success: true, registry: updated });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
