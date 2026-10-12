import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import Role from '@/models/Role';
import User from '@/models/User';
import Project from '@/models/Project';
import Plot from '@/models/Plot';
import Customer from '@/models/Customer';
import Booking from '@/models/Booking';
import Incentive from '@/models/Incentive';
import Registry from '@/models/Registry';
import Payout from '@/models/Payout';
import Notification from '@/models/Notification';
import AuditLog from '@/models/AuditLog';
import { hashPassword } from '@/lib/auth';
import { calculateAndCreateIncentives, processIncentiveApproval, generatePayoutsForApprovedBooking } from '@/lib/incentiveEngine';

export async function POST(req) {
  try {
    await connectDB();

    // 1. Clean existing collections
    await Role.deleteMany({});
    await User.deleteMany({});
    await Project.deleteMany({});
    await Plot.deleteMany({});
    await Customer.deleteMany({});
    await Booking.deleteMany({});
    await Incentive.deleteMany({});
    await Registry.deleteMany({});
    await Payout.deleteMany({});
    await Notification.deleteMany({});
    await AuditLog.deleteMany({});

    // 2. Create Dynamic Roles (Section 2.1 & 3.3)
    const roleAdmin = await Role.create({
      name: 'Admin',
      rank: 0,
      isRoot: true,
      sellerRate: 200,
      overrideRate: 20,
    });

    const roleDirector = await Role.create({
      name: 'Director',
      rank: 1,
      isRoot: false,
      sellerRate: 150,
      overrideRate: 30,
    });

    const roleManager = await Role.create({
      name: 'Sales Manager',
      rank: 2,
      isRoot: false,
      sellerRate: 125,
      overrideRate: 40,
    });

    const roleSalesExecutive = await Role.create({
      name: 'Sales Executive',
      rank: 3,
      isRoot: false,
      sellerRate: 100,
      overrideRate: 0,
    });

    const defaultPassword = await hashPassword('Password@123');

    // 3. Create Hierarchical Users (Unlimited Depth & Mixed Teams)
    // ROOT ADMIN (Rank 0)
    const userAdmin = await User.create({
      name: 'Suresh Singhania (Admin)',
      email: 'admin@mahalaxmi.com',
      phone: '9876543210',
      password: defaultPassword,
      roleId: roleAdmin._id,
      reportsTo: null,
      status: 'active',
    });

    // BRANCH 1: Indore Division under Director Rajesh Sharma (Rank 1)
    const userDirectorRajesh = await User.create({
      name: 'Rajesh Sharma (Director)',
      email: 'rajesh.director@mahalaxmi.com',
      phone: '9876543211',
      password: defaultPassword,
      roleId: roleDirector._id,
      reportsTo: userAdmin._id,
      status: 'active',
    });

    // BRANCH 2: Ujjain & Central Division under Director Sunita Deshmukh (Rank 1 - Parallel Branch!)
    const userDirectorSunita = await User.create({
      name: 'Sunita Deshmukh (Director)',
      email: 'sunita.director@mahalaxmi.com',
      phone: '9876543212',
      password: defaultPassword,
      roleId: roleDirector._id,
      reportsTo: userAdmin._id,
      status: 'active',
    });

    // Under Director Rajesh -> Sales Manager Vikram Joshi (Rank 2)
    const userManagerVikram = await User.create({
      name: 'Vikram Joshi (Sales Manager)',
      email: 'vikram.manager@mahalaxmi.com',
      phone: '9876543213',
      password: defaultPassword,
      roleId: roleManager._id,
      reportsTo: userDirectorRajesh._id,
      status: 'active',
    });

    // Under Director Rajesh -> Sales Manager Priya Mehta (Rank 2)
    const userManagerPriya = await User.create({
      name: 'Priya Mehta (Sales Manager)',
      email: 'priya.manager@mahalaxmi.com',
      phone: '9876543214',
      password: defaultPassword,
      roleId: roleManager._id,
      reportsTo: userDirectorRajesh._id,
      status: 'active',
    });

    // Under Sales Manager Vikram -> Sales Executive Amit Patel & Rohit Jain
    const userSalesAmit = await User.create({
      name: 'Amit Patel (Sales Executive)',
      email: 'amit.sales@mahalaxmi.com',
      phone: '9876543216',
      password: defaultPassword,
      roleId: roleSalesExecutive._id,
      reportsTo: userManagerVikram._id,
      status: 'active',
    });

    const userSalesRohit = await User.create({
      name: 'Rohit Jain (Sales Executive)',
      email: 'rohit.sales@mahalaxmi.com',
      phone: '9876543217',
      password: defaultPassword,
      roleId: roleSalesExecutive._id,
      reportsTo: userManagerVikram._id,
      status: 'active',
    });

    // Under Sales Manager Priya -> Sales Executive Sneha Kulkarni
    const userSalesSneha = await User.create({
      name: 'Sneha Kulkarni (Sales Executive)',
      email: 'sneha.sales@mahalaxmi.com',
      phone: '9876543219',
      password: defaultPassword,
      roleId: roleSalesExecutive._id,
      reportsTo: userManagerPriya._id,
      status: 'active',
    });

    // MIXED TEAM 1: Neha reports DIRECTLY to Director Rajesh (bypassing managers!)
    const userDirectSalesNeha = await User.create({
      name: 'Neha Verma (Direct Sales Advisor)',
      email: 'neha.sales@mahalaxmi.com',
      phone: '9876543220',
      password: defaultPassword,
      roleId: roleSalesExecutive._id,
      reportsTo: userDirectorRajesh._id,
      status: 'active',
    });

    // Under Director Sunita -> Sales Manager Alok Saxena (Rank 2)
    const userManagerAlok = await User.create({
      name: 'Alok Saxena (Sales Manager)',
      email: 'alok.manager@mahalaxmi.com',
      phone: '9876543221',
      password: defaultPassword,
      roleId: roleManager._id,
      reportsTo: userDirectorSunita._id,
      status: 'active',
    });

    // Under Manager Alok -> Sales Executive Pooja Nair (Rank 5)
    const userSalesPooja = await User.create({
      name: 'Pooja Nair (Sales Executive)',
      email: 'pooja.sales@mahalaxmi.com',
      phone: '9876543222',
      password: defaultPassword,
      roleId: roleSalesExecutive._id,
      reportsTo: userManagerAlok._id,
      status: 'active',
    });

    // MIXED TEAM 2: Rahul Tiwari reports DIRECTLY to Director Sunita
    const userDirectSalesRahul = await User.create({
      name: 'Rahul Tiwari (Direct Sales Advisor)',
      email: 'rahul.sales@mahalaxmi.com',
      phone: '9876543223',
      password: defaultPassword,
      roleId: roleSalesExecutive._id,
      reportsTo: userDirectorSunita._id,
      status: 'active',
    });

    // 4. Create Shared Projects (Section 5.1: Visible to everyone, Admin CRUD)
    const project1 = await Project.create({
      name: 'Mahalaxmi Nagar 39',
      code: 'MN-39',
      location: 'Super Corridor, Indore',
      totalAreaSqFt: 150000,
      description: 'Prime mega-township on Super Corridor with grand clubhouse, 60ft wide arterial roads, underground drainage, and RERA approval.',
      status: 'active',
      createdBy: userAdmin._id,
    });

    const project2 = await Project.create({
      name: 'Mahalaxmi Elite Enclave',
      code: 'MEE-12',
      location: 'AB Road Bypass, Near DPS, Indore',
      totalAreaSqFt: 95000,
      description: 'Ultra-luxury gated community featuring scenic central park, jogging track, 24/7 high-tech CCTV surveillance, and solar lighting.',
      status: 'active',
      createdBy: userAdmin._id,
    });

    const project3 = await Project.create({
      name: 'Mahalaxmi Royal Palms',
      code: 'MRP-05',
      location: 'Indore-Ujjain Highway, Sanwer Road',
      totalAreaSqFt: 180000,
      description: 'Rapidly appreciating highway-touch plotted development with shopping commercial arcade and recreational water bodies.',
      status: 'active',
      createdBy: userAdmin._id,
    });

    const project4 = await Project.create({
      name: 'Mahalaxmi Green Meadows',
      code: 'MGM-21',
      location: 'Rau-Pithampur Economic Corridor',
      totalAreaSqFt: 80000,
      description: 'Serene lifestyle plots strategically situated near industrial and IT growth zones.',
      status: 'active',
      createdBy: userAdmin._id,
    });

    // 5. Create Relational Plots Inventory (25+ plots)
    const plotsData = [
      // Project 1: MN-39
      { projectId: project1._id, plotNumber: 'Plot-101', sizeSqFt: 1500, ratePerSqFt: 2500, totalPrice: 3750000, dimension: '30x50', facing: 'East', status: 'registered', createdBy: userAdmin._id },
      { projectId: project1._id, plotNumber: 'Plot-102', sizeSqFt: 2000, ratePerSqFt: 2500, totalPrice: 5000000, dimension: '40x50', facing: 'North', status: 'booked', createdBy: userAdmin._id },
      { projectId: project1._id, plotNumber: 'Plot-103', sizeSqFt: 1800, ratePerSqFt: 2600, totalPrice: 4680000, dimension: '30x60', facing: 'West', status: 'booked', createdBy: userAdmin._id },
      { projectId: project1._id, plotNumber: 'Plot-104', sizeSqFt: 2400, ratePerSqFt: 2700, totalPrice: 6480000, dimension: '40x60', facing: 'North-East', status: 'booked', createdBy: userAdmin._id },
      { projectId: project1._id, plotNumber: 'Plot-105', sizeSqFt: 1500, ratePerSqFt: 2500, totalPrice: 3750000, dimension: '30x50', facing: 'East', status: 'available', createdBy: userAdmin._id },
      { projectId: project1._id, plotNumber: 'Plot-106', sizeSqFt: 1800, ratePerSqFt: 2600, totalPrice: 4680000, dimension: '30x60', facing: 'North', status: 'available', createdBy: userAdmin._id },
      { projectId: project1._id, plotNumber: 'Plot-107', sizeSqFt: 2100, ratePerSqFt: 2650, totalPrice: 5565000, dimension: '35x60', facing: 'South', status: 'available', createdBy: userAdmin._id },
      { projectId: project1._id, plotNumber: 'Plot-108', sizeSqFt: 3000, ratePerSqFt: 2800, totalPrice: 8400000, dimension: '50x60', facing: 'East', status: 'available', createdBy: userAdmin._id },

      // Project 2: MEE-12
      { projectId: project2._id, plotNumber: 'Plot-201', sizeSqFt: 1600, ratePerSqFt: 3000, totalPrice: 4800000, dimension: '32x50', facing: 'East', status: 'booked', createdBy: userAdmin._id },
      { projectId: project2._id, plotNumber: 'Plot-202', sizeSqFt: 2200, ratePerSqFt: 3100, totalPrice: 6820000, dimension: '44x50', facing: 'North', status: 'available', createdBy: userAdmin._id },
      { projectId: project2._id, plotNumber: 'Plot-203', sizeSqFt: 2500, ratePerSqFt: 3200, totalPrice: 8000000, dimension: '50x50', facing: 'East', status: 'available', createdBy: userAdmin._id },
      { projectId: project2._id, plotNumber: 'Plot-204', sizeSqFt: 1800, ratePerSqFt: 3050, totalPrice: 5490000, dimension: '30x60', facing: 'West', status: 'reserved', createdBy: userAdmin._id },
      { projectId: project2._id, plotNumber: 'Plot-205', sizeSqFt: 2800, ratePerSqFt: 3300, totalPrice: 9240000, dimension: '40x70', facing: 'North-East', status: 'available', createdBy: userAdmin._id },

      // Project 3: MRP-05
      { projectId: project3._id, plotNumber: 'Plot-301', sizeSqFt: 1200, ratePerSqFt: 2200, totalPrice: 2640000, dimension: '30x40', facing: 'East', status: 'booked', createdBy: userAdmin._id },
      { projectId: project3._id, plotNumber: 'Plot-302', sizeSqFt: 1500, ratePerSqFt: 2250, totalPrice: 3375000, dimension: '30x50', facing: 'North', status: 'available', createdBy: userAdmin._id },
      { projectId: project3._id, plotNumber: 'Plot-303', sizeSqFt: 1800, ratePerSqFt: 2300, totalPrice: 4140000, dimension: '30x60', facing: 'East', status: 'available', createdBy: userAdmin._id },
      { projectId: project3._id, plotNumber: 'Plot-304', sizeSqFt: 2000, ratePerSqFt: 2350, totalPrice: 4700000, dimension: '40x50', facing: 'West', status: 'available', createdBy: userAdmin._id },
      { projectId: project3._id, plotNumber: 'Plot-305', sizeSqFt: 2400, ratePerSqFt: 2400, totalPrice: 5760000, dimension: '40x60', facing: 'North-East', status: 'available', createdBy: userAdmin._id },

      // Project 4: MGM-21
      { projectId: project4._id, plotNumber: 'Plot-401', sizeSqFt: 1500, ratePerSqFt: 2400, totalPrice: 3600000, dimension: '30x50', facing: 'East', status: 'booked', createdBy: userAdmin._id },
      { projectId: project4._id, plotNumber: 'Plot-402', sizeSqFt: 1800, ratePerSqFt: 2450, totalPrice: 4410000, dimension: '30x60', facing: 'North', status: 'available', createdBy: userAdmin._id },
      { projectId: project4._id, plotNumber: 'Plot-403', sizeSqFt: 2000, ratePerSqFt: 2500, totalPrice: 5000000, dimension: '40x50', facing: 'West', status: 'available', createdBy: userAdmin._id },
    ];
    const plots = await Plot.insertMany(plotsData);

    // Map plot numbers for easy lookup
    const plotMap = {};
    plots.forEach((p) => {
      plotMap[p.plotNumber] = p;
    });

    // 6. Create Downline-Scoped Customers
    const customersData = [
      { name: 'Rameshwar Solanki', phone: '9826011223', email: 'rameshwar.solanki@gmail.com', address: '42 Old Palasia', city: 'Indore', panNumber: 'ABCDE1234F', aadhaarNumber: '123456789012', createdBy: userSalesAmit._id },
      { name: 'Dr. Anand Patwardhan', phone: '9827012345', email: 'anand.patwardhan@yahoo.com', address: '15 Saket Club Road', city: 'Indore', panNumber: 'FGHIJ5678K', aadhaarNumber: '234567890123', createdBy: userDirectSalesNeha._id },
      { name: 'Sunil & Sunita Sharma', phone: '9826098765', email: 'sunil.sharma@outlook.com', address: '88 Vijay Nagar', city: 'Indore', panNumber: 'KLMNO9012P', aadhaarNumber: '345678901234', createdBy: userSalesSneha._id },
      { name: 'Manorama Devi Agrawal', phone: '9826123456', email: 'manorama.agrawal@gmail.com', address: '12 South Tukoganj', city: 'Indore', panNumber: 'QRSTU3456V', aadhaarNumber: '456789012345', createdBy: userDirectorRajesh._id },
      { name: 'Rajendra Prasad Soni', phone: '9827112233', email: 'rajendra.soni@gmail.com', address: '24 Mahakal Marg', city: 'Ujjain', panNumber: 'UVWXY7890Z', aadhaarNumber: '567890123456', createdBy: userSalesPooja._id },
      { name: 'Deepak V. Rathore', phone: '9826334455', email: 'deepak.rathore@gmail.com', address: '77 Khatiwala Tank', city: 'Indore', panNumber: 'BCDEF2345G', aadhaarNumber: '678901234567', createdBy: userSalesRohit._id },
      { name: 'Kailash Chand Jain', phone: '9826556677', email: 'kailash.jain@rediffmail.com', address: '109 Sarafa Bazar', city: 'Indore', panNumber: 'HIJKL6789M', aadhaarNumber: '789012345678', createdBy: userTeamLeadManish._id },
      { name: 'Virendra Singh Chouhan', phone: '9827889900', email: 'virendra.chouhan@gmail.com', address: '55 Dewas Road', city: 'Ujjain', panNumber: 'NOPQR1234S', aadhaarNumber: '890123456789', createdBy: userDirectSalesRahul._id },
    ];
    const customers = await Customer.insertMany(customersData);

    // 7. Create Relational Bookings Across Multiple Hierarchy Levels & Statuses
    // BOOKING 1: Sold by Amit Patel (Rank 5) -> Chain: Amit(R5) -> Manish(R3) -> Vikram(R2) -> Rajesh(R1) -> Suresh(R0)
    // Milestone: Reached REGISTRY!
    const booking1 = await Booking.create({
      bookingNumber: 'BK-MN39-101',
      plotId: plotMap['Plot-101']._id,
      projectId: project1._id,
      customerId: customers[0]._id, // Rameshwar Solanki
      sellerId: userSalesAmit._id,
      bookingAmount: 500000,
      totalPlotValue: plotMap['Plot-101'].totalPrice,
      paymentMode: 'Cheque',
      transactionReference: 'CHQ-889101',
      status: 'registry',
      activatedAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
      notes: 'Full payment verified. Registry executed and stamped at Sub-Registrar.',
      createdBy: userSalesAmit._id,
    });

    // Calculate upward walk incentives for Booking 1
    await calculateAndCreateIncentives(booking1._id);

    // Mark incentives approved for Booking 1 (simulating full sequential approval by Manish -> Vikram -> Rajesh -> Suresh)
    await Incentive.updateMany(
      { bookingId: booking1._id },
      {
        $set: {
          status: 'approved',
          currentApproverId: null,
          'approvalChain.$[].status': 'approved',
          'approvalChain.$[].comments': 'Verified documents and payment receipt',
          'approvalChain.$[].actionDate': new Date(),
        },
      }
    );

    // Generate Payouts for Booking 1
    await generatePayoutsForApprovedBooking(booking1._id);

    // Mark Amit's payout as PAID, others as APPROVED
    const amitPayout = await Payout.findOne({ bookingId: booking1._id, recipientId: userSalesAmit._id });
    if (amitPayout) {
      amitPayout.status = 'paid';
      amitPayout.paymentMode = 'Bank Transfer (NEFT/RTGS)';
      amitPayout.transactionReference = 'UTR-HDFC-991827364';
      amitPayout.paidAt = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000);
      amitPayout.approvedBy = userAdmin._id;
      amitPayout.remarks = 'Transferred via RTGS to HDFC bank account';
      await amitPayout.save();
    }

    // Create Registry record for Booking 1
    await Registry.create({
      bookingId: booking1._id,
      plotId: plotMap['Plot-101']._id,
      customerId: customers[0]._id,
      sellerId: userSalesAmit._id,
      registryNumber: 'REG-IND-2026-00452',
      registryDate: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
      registryOffice: 'Sub-Registrar Office - 1, Indore',
      stampDutyAmount: 262500,
      remarks: 'Plot conveyance deed registered successfully. Original papers handed to customer.',
      status: 'completed',
      createdBy: userSalesAmit._id,
    });

    // BOOKING 2: Mixed Team sale by Neha Verma (Direct Sales under Director Rajesh)
    // Chain: Neha(R5) -> Rajesh(R1) -> Suresh(R0) [Only 2 upline managers!]
    // Status: ACTIVE, pending review
    const booking2 = await Booking.create({
      bookingNumber: 'BK-MN39-102',
      plotId: plotMap['Plot-102']._id,
      projectId: project1._id,
      customerId: customers[1]._id, // Dr. Anand Patwardhan
      sellerId: userDirectSalesNeha._id,
      bookingAmount: 750000,
      totalPlotValue: plotMap['Plot-102'].totalPrice,
      paymentMode: 'NEFT/RTGS',
      transactionReference: 'NEFT-AXIS-778899',
      status: 'active',
      activatedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
      notes: 'Initial booking amount paid via NEFT. Customer visiting this weekend for registry draft.',
      createdBy: userDirectSalesNeha._id,
    });
    await calculateAndCreateIncentives(booking2._id);

    // BOOKING 3: Sold by Sneha Kulkarni (Senior Sales under Kavita -> Priya -> Rajesh -> Suresh)
    // Status: ACTIVE, pending approval
    const booking3 = await Booking.create({
      bookingNumber: 'BK-MN39-103',
      plotId: plotMap['Plot-103']._id,
      projectId: project1._id,
      customerId: customers[2]._id, // Sunil Sharma
      sellerId: userSalesSneha._id,
      bookingAmount: 600000,
      totalPlotValue: plotMap['Plot-103'].totalPrice,
      paymentMode: 'Cheque',
      transactionReference: 'CHQ-SBI-445566',
      status: 'active',
      activatedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      notes: 'Customer opted for corner orientation plot.',
      createdBy: userSalesSneha._id,
    });
    await calculateAndCreateIncentives(booking3._id);

    // BOOKING 4: Sold directly by Director Rajesh Sharma himself! (Section 3.2: 2 records: Rajesh + Suresh)
    // Status: ACTIVE, fully approved
    const booking4 = await Booking.create({
      bookingNumber: 'BK-MEE-201',
      plotId: plotMap['Plot-201']._id,
      projectId: project2._id,
      customerId: customers[3]._id, // Manorama Devi Agrawal
      sellerId: userDirectorRajesh._id,
      bookingAmount: 1000000,
      totalPlotValue: plotMap['Plot-201'].totalPrice,
      paymentMode: 'Demand Draft',
      transactionReference: 'DD-PNB-112233',
      status: 'active',
      activatedAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
      notes: 'High-net-worth VIP client handled directly by Director.',
      createdBy: userDirectorRajesh._id,
    });
    await calculateAndCreateIncentives(booking4._id);
    // Approve Rajesh's booking directly
    await Incentive.updateMany(
      { bookingId: booking4._id },
      {
        $set: {
          status: 'approved',
          currentApproverId: null,
          'approvalChain.$[].status': 'approved',
          'approvalChain.$[].comments': 'Executive sale approved by Owner/Admin',
          'approvalChain.$[].actionDate': new Date(),
        },
      }
    );
    await generatePayoutsForApprovedBooking(booking4._id);

    // BOOKING 5: Sold by Pooja Nair (under Central Division: Pooja -> Alok -> Sunita -> Suresh)
    // In Project 3: Mahalaxmi Royal Palms
    const booking5 = await Booking.create({
      bookingNumber: 'BK-MRP-301',
      plotId: plotMap['Plot-301']._id,
      projectId: project3._id,
      customerId: customers[4]._id, // Rajendra Prasad Soni
      sellerId: userSalesPooja._id,
      bookingAmount: 400000,
      totalPlotValue: plotMap['Plot-301'].totalPrice,
      paymentMode: 'UPI',
      transactionReference: 'UPI-ICICI-99887766',
      status: 'active',
      activatedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
      notes: 'Customer booked highway plot for future commercial-residential use.',
      createdBy: userSalesPooja._id,
    });
    await calculateAndCreateIncentives(booking5._id);

    // BOOKING 6: In MGM-21 (Pending payment clearance)
    const booking6 = await Booking.create({
      bookingNumber: 'BK-MGM-401',
      plotId: plotMap['Plot-401']._id,
      projectId: project4._id,
      customerId: customers[5]._id, // Deepak Rathore
      sellerId: userSalesRohit._id,
      bookingAmount: 300000,
      totalPlotValue: plotMap['Plot-401'].totalPrice,
      paymentMode: 'Cheque',
      transactionReference: 'CHQ-KOTAK-556677',
      status: 'pending',
      notes: 'Token advance received. Cheque clearing in progress.',
      createdBy: userSalesRohit._id,
    });

    // 8. Create Hierarchy-Scoped Notifications for Various Users
    await Notification.create([
      {
        recipientId: userDirectorRajesh._id,
        title: 'New Downline Booking',
        message: 'Amit Patel created Booking #BK-MN39-101 for Plot-101 in Mahalaxmi Nagar 39.',
        type: 'booking',
        link: '/dashboard/bookings',
        isRead: true,
      },
      {
        recipientId: userManagerVikram._id,
        title: 'Incentive Approval Required',
        message: 'Booking #BK-MN39-102 is awaiting your review and approval.',
        type: 'incentive_approval',
        link: '/dashboard/incentives',
        isRead: false,
      },
      {
        recipientId: userSalesAmit._id,
        title: 'Payout Disbursed!',
        message: 'Your commission of ₹1,50,000 for Plot-101 has been disbursed via RTGS. Bill #MI-BILL-101.',
        type: 'payout',
        link: '/dashboard/payouts',
        isRead: false,
      },
      {
        recipientId: userAdmin._id,
        title: 'Registry Completed',
        message: 'Plot-101 registry #REG-IND-2026-00452 has been officially completed.',
        type: 'registry',
        link: '/dashboard/registries',
        isRead: false,
      },
      {
        recipientId: userDirectorSunita._id,
        title: 'Central Zone Booking Alert',
        message: 'Pooja Nair closed a booking for Plot-301 in Mahalaxmi Royal Palms.',
        type: 'booking',
        link: '/dashboard/bookings',
        isRead: false,
      },
    ]);

    // 9. Add Audit Trail Records
    await AuditLog.create([
      { userId: userAdmin._id, action: 'PROJECT_CREATED', entityType: 'Project', entityId: project1._id.toString(), details: { name: project1.name } },
      { userId: userSalesAmit._id, action: 'BOOKING_CREATED', entityType: 'Booking', entityId: booking1._id.toString(), details: { amount: booking1.bookingAmount } },
      { userId: userAdmin._id, action: 'PAYOUT_DISBURSED', entityType: 'Payout', entityId: amitPayout?._id?.toString() || '', details: { amount: amitPayout?.amount } },
    ]);

    return NextResponse.json({
      success: true,
      message: 'Comprehensive relational dummy data successfully seeded across all 10 modules!',
      stats: {
        roles: 6,
        users: 12,
        projects: 4,
        plots: plots.length,
        customers: customers.length,
        bookings: 6,
        incentives: await Incentive.countDocuments(),
        registries: await Registry.countDocuments(),
        payouts: await Payout.countDocuments(),
        notifications: await Notification.countDocuments(),
      },
      credentials: [
        { role: 'Admin (Top Authority)', email: 'admin@mahalaxmi.com', name: 'Suresh Singhania', password: 'Password@123' },
        { role: 'Director (Indore Div)', email: 'rajesh.director@mahalaxmi.com', name: 'Rajesh Sharma', password: 'Password@123' },
        { role: 'Director (Ujjain/Bhopal)', email: 'sunita.director@mahalaxmi.com', name: 'Sunita Deshmukh', password: 'Password@123' },
        { role: 'Sales Manager', email: 'vikram.manager@mahalaxmi.com', name: 'Vikram Joshi', password: 'Password@123' },
        { role: 'Sales Executive', email: 'amit.sales@mahalaxmi.com', name: 'Amit Patel', password: 'Password@123' },
        { role: 'Direct Sales Advisor (Mixed Team)', email: 'neha.sales@mahalaxmi.com', name: 'Neha Verma', password: 'Password@123' },
      ],
    });
  } catch (error) {
    console.error('[Seed Error]', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function GET(req) {
  return POST(req);
}
