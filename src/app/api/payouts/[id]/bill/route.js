import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import Payout from '@/models/Payout';
import Booking from '@/models/Booking';
import Plot from '@/models/Plot';
import Project from '@/models/Project';
import User from '@/models/User';
import Customer from '@/models/Customer';
import Incentive from '@/models/Incentive';
import { getAuthUser } from '@/lib/auth';
import { generateMahalaxmiBillPDF } from '@/lib/pdfBill';

export async function GET(req, { params }) {
  try {
    await connectDB();
    const user = await getAuthUser(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = params;
    const payout = await Payout.findById(id)
      .populate({
        path: 'recipientId',
        populate: { path: 'roleId', select: 'name code rank' }
      })
      .populate('bookingId');

    if (!payout) {
      return NextResponse.json({ error: 'Payout not found' }, { status: 404 });
    }

    const booking = await Booking.findById(payout.bookingId)
      .populate('plotId')
      .populate('projectId')
      .populate('customerId')
      .populate({
        path: 'sellerId',
        populate: { path: 'roleId', select: 'name code rank' }
      });

    if (!booking) {
      return NextResponse.json({ error: 'Associated booking not found' }, { status: 404 });
    }

    // Fetch all incentives for this booking to populate the multi-tier upline breakdown table
    const allIncentives = await Incentive.find({ bookingId: booking._id })
      .populate('recipientId', 'name email phone')
      .populate('roleId', 'name rank')
      .sort({ rank: 1 })
      .lean();

    const pdfBuffer = generateMahalaxmiBillPDF({
      payout,
      booking,
      project: booking.projectId,
      plot: booking.plotId,
      customer: booking.customerId,
      seller: booking.sellerId,
      recipient: payout.recipientId,
      allIncentives,
    });

    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="Mahalaxmi_Bill_${payout.billNumber}.pdf"`,
      },
    });
  } catch (error) {
    console.error('[PDF Bill Gen Error]', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
