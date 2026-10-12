import mongoose from 'mongoose';
import User from '../models/User.js';
import Role from '../models/Role.js';
import Plot from '../models/Plot.js';
import Booking from '../models/Booking.js';
import Incentive from '../models/Incentive.js';
import Payout from '../models/Payout.js';
import Notification from '../models/Notification.js';
import { getUplineChain } from './hierarchy.js';

/**
 * Calculates and creates all incentive records for an activated booking.
 * Walks seller's upline dynamically from seller to Admin.
 */
export async function calculateAndCreateIncentives(bookingId) {
  const booking = await Booking.findById(bookingId)
    .populate('sellerId')
    .populate('plotId');

  if (!booking) {
    throw new Error('Booking not found');
  }

  const plot = booking.plotId;
  const seller = booking.sellerId;
  const sellerRole = await Role.findById(seller.roleId);

  if (!plot || !seller || !sellerRole) {
    throw new Error('Plot, seller, or role missing for incentive calculation');
  }

  // Remove any pre-existing draft/submitted records for this booking
  await Incentive.deleteMany({ bookingId: booking._id, status: { $in: ['draft', 'submitted'] } });

  const plotSizeSqFt = plot.sizeSqFt;
  const upline = await getUplineChain(seller._id);

  // Determine approval chain
  // Auto-approved if Admin is seller, otherwise starts 1 rank above seller up to Admin
  const isSellerAdmin = sellerRole.isRoot || sellerRole.rank === 0;

  const approvalChain = upline.map((ancestor) => ({
    approverId: ancestor._id,
    rank: ancestor.roleId?.rank ?? 0,
    status: 'pending',
    comments: '',
    actionDate: null,
  }));

  const initialStatus = isSellerAdmin ? 'approved' : 'submitted';
  const initialApprover = isSellerAdmin ? null : (approvalChain.length > 0 ? approvalChain[0].approverId : null);

  const incentiveDocs = [];

  // 1. Direct Seller Incentive
  const sellerRate = sellerRole.sellerRate || 0;
  const sellerAmount = plotSizeSqFt * sellerRate;

  incentiveDocs.push({
    bookingId: booking._id,
    recipientId: seller._id,
    roleId: sellerRole._id,
    rank: sellerRole.rank,
    basis: 'seller',
    plotSizeSqFt,
    ratePerSqFt: sellerRate,
    amount: sellerAmount,
    status: initialStatus,
    currentApproverId: initialApprover,
    approvalChain: isSellerAdmin ? [] : approvalChain,
    currentStepIndex: 0,
  });

  // 2. Ancestor Override Incentives
  for (const ancestor of upline) {
    const ancestorRole = ancestor.roleId;
    const overrideRate = ancestorRole.overrideRate || 0;
    const overrideAmount = plotSizeSqFt * overrideRate;

    incentiveDocs.push({
      bookingId: booking._id,
      recipientId: ancestor._id,
      roleId: ancestorRole._id,
      rank: ancestorRole.rank,
      basis: 'override',
      plotSizeSqFt,
      ratePerSqFt: overrideRate,
      amount: overrideAmount,
      status: initialStatus,
      currentApproverId: initialApprover,
      approvalChain: isSellerAdmin ? [] : approvalChain,
      currentStepIndex: 0,
    });
  }

  const createdIncentives = await Incentive.insertMany(incentiveDocs);

  // If auto-approved (seller is admin), generate payouts immediately
  if (isSellerAdmin) {
    await generatePayoutsForApprovedBooking(booking._id);
  } else {
    // Notify the first approver in the chain
    if (initialApprover) {
      await Notification.create({
        recipientId: initialApprover,
        title: 'New Incentive Approval Required',
        message: `Booking #${booking.bookingNumber} for Plot ${plot.plotNumber} is awaiting your incentive approval.`,
        type: 'incentive_approval',
        link: '/dashboard/incentives',
        metadata: { bookingId: booking._id },
      });
    }

    // Notify each recipient that incentives were calculated
    for (const inc of createdIncentives) {
      await Notification.create({
        recipientId: inc.recipientId,
        title: 'Incentive Created',
        message: `Incentive of ₹${inc.amount.toLocaleString('en-IN')} created for Plot ${plot.plotNumber}. Awaiting upline approval.`,
        type: 'booking',
        link: '/dashboard/incentives',
        metadata: { bookingId: booking._id, incentiveId: inc._id },
      });
    }
  }

  return createdIncentives;
}

/**
 * Handles an approval or rejection by an upline approver.
 */
export async function processIncentiveApproval({ bookingId, approverUser, decision, comments = '' }) {
  const incentives = await Incentive.find({ bookingId, status: 'submitted' });
  if (!incentives || incentives.length === 0) {
    throw new Error('No pending incentive records found for this booking');
  }

  const booking = await Booking.findById(bookingId).populate('plotId');
  const approverIdStr = approverUser._id.toString();

  // Verify that this user is currently authorized to approve
  const firstDoc = incentives[0];
  if (firstDoc.currentApproverId?.toString() !== approverIdStr && !approverUser.roleId?.isRoot) {
    throw new Error('You are not the designated approver for the current step');
  }

  const stepIndex = firstDoc.currentStepIndex;
  const chain = firstDoc.approvalChain;

  if (decision === 'rejected') {
    // Rejection stops the chain and voids / marks rejected
    for (const inc of incentives) {
      if (inc.approvalChain[stepIndex]) {
        inc.approvalChain[stepIndex].status = 'rejected';
        inc.approvalChain[stepIndex].comments = comments;
        inc.approvalChain[stepIndex].actionDate = new Date();
      }
      inc.status = 'rejected';
      inc.currentApproverId = null;
      await inc.save();
    }

    // Notify seller
    await Notification.create({
      recipientId: booking.sellerId,
      title: 'Incentive Rejected',
      message: `Incentive for Booking #${booking.bookingNumber} was rejected by ${approverUser.name}. Reason: ${comments || 'No comment'}`,
      type: 'incentive_approval',
      link: '/dashboard/incentives',
      metadata: { bookingId: booking._id },
    });

    return { status: 'rejected', message: 'Incentive chain rejected' };
  }

  // Handle 'approved'
  const isLastStep = stepIndex >= chain.length - 1;

  for (const inc of incentives) {
    if (inc.approvalChain[stepIndex]) {
      inc.approvalChain[stepIndex].status = 'approved';
      inc.approvalChain[stepIndex].comments = comments;
      inc.approvalChain[stepIndex].actionDate = new Date();
    }

    if (isLastStep) {
      // Final approval (Admin or top of chain reached)
      inc.status = 'approved';
      inc.currentApproverId = null;
    } else {
      // Advance to next ancestor in chain
      inc.currentStepIndex = stepIndex + 1;
      inc.currentApproverId = chain[stepIndex + 1].approverId;
    }

    await inc.save();
  }

  if (isLastStep) {
    // Generate payouts
    await generatePayoutsForApprovedBooking(bookingId);

    // Notify all recipients
    for (const inc of incentives) {
      await Notification.create({
        recipientId: inc.recipientId,
        title: 'Incentive Approved!',
        message: `Your incentive of ₹${inc.amount.toLocaleString('en-IN')} for Booking #${booking.bookingNumber} is fully approved!`,
        type: 'incentive_approved',
        link: '/dashboard/payouts',
        metadata: { bookingId: booking._id },
      });
    }

    return { status: 'approved', message: 'Incentive chain fully approved and payouts created' };
  } else {
    // Notify the next approver
    const nextApproverId = chain[stepIndex + 1].approverId;
    await Notification.create({
      recipientId: nextApproverId,
      title: 'Incentive Approval Required',
      message: `Booking #${booking.bookingNumber} is awaiting your review (approved by previous manager).`,
      type: 'incentive_approval',
      link: '/dashboard/incentives',
      metadata: { bookingId: booking._id },
    });

    return { status: 'in_progress', message: 'Approved. Advanced to next reviewer in hierarchy' };
  }
}

/**
 * Generates Payout records for each approved incentive in a booking.
 */
export async function generatePayoutsForApprovedBooking(bookingId) {
  const incentives = await Incentive.find({ bookingId, status: 'approved' });
  const payouts = [];

  for (const inc of incentives) {
    const existing = await Payout.findOne({ incentiveId: inc._id });
    if (!existing) {
      const billNumber = `MI-BILL-${Date.now().toString().slice(-6)}-${Math.floor(1000 + Math.random() * 9000)}`;
      payouts.push({
        billNumber,
        bookingId: inc.bookingId,
        recipientId: inc.recipientId,
        incentiveId: inc._id,
        amount: inc.amount,
        status: 'pending',
      });
    }
  }

  if (payouts.length > 0) {
    await Payout.insertMany(payouts);
  }
}

/**
 * Voids all incentives for a cancelled booking.
 */
export async function voidIncentivesForBooking(bookingId) {
  await Incentive.updateMany(
    { bookingId, status: { $ne: 'voided' } },
    { $set: { status: 'voided', currentApproverId: null } }
  );
  await Payout.updateMany(
    { bookingId, status: { $ne: 'paid' } },
    { $set: { status: 'rejected', remarks: 'Booking was cancelled' } }
  );
}
