import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/mahalaxmi_crm';

async function main() {
  console.log('Connecting to MongoDB at:', MONGODB_URI);
  try {
    await mongoose.connect(MONGODB_URI, { serverSelectionTimeoutMS: 2500 });
    console.log('Connected to local/remote MongoDB instance.');
  } catch (err) {
    console.warn(`Could not connect to ${MONGODB_URI} (${err.message}). Starting embedded MongoMemoryServer...`);
    const { MongoMemoryServer } = await import('mongodb-memory-server');
    const mongoServer = await MongoMemoryServer.create({ instance: { dbName: 'mahalaxmi_crm' } });
    const uri = mongoServer.getUri();
    console.log('Embedded MongoMemoryServer started at:', uri);
    await mongoose.connect(uri);
  }

  const { default: Role } = await import('../src/models/Role.js');
  const { default: User } = await import('../src/models/User.js');
  const { default: Project } = await import('../src/models/Project.js');
  const { default: Plot } = await import('../src/models/Plot.js');
  const { default: Customer } = await import('../src/models/Customer.js');
  const { default: Booking } = await import('../src/models/Booking.js');
  const { default: Incentive } = await import('../src/models/Incentive.js');
  const { default: Registry } = await import('../src/models/Registry.js');
  const { default: Payout } = await import('../src/models/Payout.js');
  const { default: Notification } = await import('../src/models/Notification.js');
  const { default: AuditLog } = await import('../src/models/AuditLog.js');
  const { calculateAndCreateIncentives, generatePayoutsForApprovedBooking } = await import('../src/lib/incentiveEngine.js');

  console.log('Clearing existing collections...');
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

  console.log('Creating dynamic roles...');
  const roleAdmin = await Role.create({ name: 'Admin', rank: 0, isRoot: true, sellerRate: 200, overrideRate: 20 });
  const roleDirector = await Role.create({ name: 'Director', rank: 1, isRoot: false, sellerRate: 150, overrideRate: 30 });
  const roleManager = await Role.create({ name: 'Sales Manager', rank: 2, isRoot: false, sellerRate: 125, overrideRate: 40 });
  const roleSalesExecutive = await Role.create({ name: 'Sales Executive', rank: 3, isRoot: false, sellerRate: 100, overrideRate: 0 });

  const salt = await bcrypt.genSalt(10);
  const defaultPassword = await bcrypt.hash('Password@123', salt);

  console.log('Creating hierarchical users (including parallel branches and mixed teams)...');
  const userAdmin = await User.create({ name: 'Suresh Singhania (Admin)', email: 'admin@mahalaxmi.com', phone: '9876543210', password: defaultPassword, roleId: roleAdmin._id, reportsTo: null });
  const userDirectorRajesh = await User.create({ name: 'Rajesh Sharma (Director)', email: 'rajesh.director@mahalaxmi.com', phone: '9876543211', password: defaultPassword, roleId: roleDirector._id, reportsTo: userAdmin._id });
  const userDirectorSunita = await User.create({ name: 'Sunita Deshmukh (Director)', email: 'sunita.director@mahalaxmi.com', phone: '9876543212', password: defaultPassword, roleId: roleDirector._id, reportsTo: userAdmin._id });

  const userManagerVikram = await User.create({ name: 'Vikram Joshi (Sales Manager)', email: 'vikram.manager@mahalaxmi.com', phone: '9876543213', password: defaultPassword, roleId: roleManager._id, reportsTo: userDirectorRajesh._id });
  const userManagerPriya = await User.create({ name: 'Priya Mehta (Sales Manager)', email: 'priya.manager@mahalaxmi.com', phone: '9876543214', password: defaultPassword, roleId: roleManager._id, reportsTo: userDirectorRajesh._id });

  const userSalesAmit = await User.create({ name: 'Amit Patel (Sales Executive)', email: 'amit.sales@mahalaxmi.com', phone: '9876543216', password: defaultPassword, roleId: roleSalesExecutive._id, reportsTo: userManagerVikram._id });
  const userSalesRohit = await User.create({ name: 'Rohit Jain (Sales Executive)', email: 'rohit.sales@mahalaxmi.com', phone: '9876543217', password: defaultPassword, roleId: roleSalesExecutive._id, reportsTo: userManagerVikram._id });

  const userSalesSneha = await User.create({ name: 'Sneha Kulkarni (Sales Executive)', email: 'sneha.sales@mahalaxmi.com', phone: '9876543219', password: defaultPassword, roleId: roleSalesExecutive._id, reportsTo: userManagerPriya._id });

  // Mixed team: Neha reports straight to Director Rajesh
  const userDirectSalesNeha = await User.create({ name: 'Neha Verma (Direct Sales Advisor)', email: 'neha.sales@mahalaxmi.com', phone: '9876543220', password: defaultPassword, roleId: roleSalesExecutive._id, reportsTo: userDirectorRajesh._id });

  // Central zone under Director Sunita
  const userManagerAlok = await User.create({ name: 'Alok Saxena (Sales Manager)', email: 'alok.manager@mahalaxmi.com', phone: '9876543221', password: defaultPassword, roleId: roleManager._id, reportsTo: userDirectorSunita._id });
  const userSalesPooja = await User.create({ name: 'Pooja Nair (Sales Executive)', email: 'pooja.sales@mahalaxmi.com', phone: '9876543222', password: defaultPassword, roleId: roleSalesExecutive._id, reportsTo: userManagerAlok._id });
  const userDirectSalesRahul = await User.create({ name: 'Rahul Tiwari (Direct Sales Advisor)', email: 'rahul.sales@mahalaxmi.com', phone: '9876543223', password: defaultPassword, roleId: roleSalesExecutive._id, reportsTo: userDirectorSunita._id });

  console.log('Creating 4 projects...');
  const project1 = await Project.create({ name: 'Mahalaxmi Nagar 39', code: 'MN-39', location: 'Super Corridor, Indore', totalAreaSqFt: 150000, description: 'Prime mega-township on Super Corridor.', status: 'active', createdBy: userAdmin._id });
  const project2 = await Project.create({ name: 'Mahalaxmi Elite Enclave', code: 'MEE-12', location: 'AB Road Bypass, Indore', totalAreaSqFt: 95000, description: 'Ultra-luxury gated community.', status: 'active', createdBy: userAdmin._id });
  const project3 = await Project.create({ name: 'Mahalaxmi Royal Palms', code: 'MRP-05', location: 'Indore-Ujjain Highway, Sanwer Road', totalAreaSqFt: 180000, description: 'Highway-touch plotted development.', status: 'active', createdBy: userAdmin._id });
  const project4 = await Project.create({ name: 'Mahalaxmi Green Meadows', code: 'MGM-21', location: 'Rau-Pithampur Economic Corridor', totalAreaSqFt: 80000, description: 'Serene lifestyle plots.', status: 'active', createdBy: userAdmin._id });

  console.log('Creating 20+ plots...');
  const plotsData = [
    { projectId: project1._id, plotNumber: 'Plot-101', sizeSqFt: 1500, ratePerSqFt: 2500, totalPrice: 3750000, dimension: '30x50', facing: 'East', status: 'registered', createdBy: userAdmin._id },
    { projectId: project1._id, plotNumber: 'Plot-102', sizeSqFt: 2000, ratePerSqFt: 2500, totalPrice: 5000000, dimension: '40x50', facing: 'North', status: 'booked', createdBy: userAdmin._id },
    { projectId: project1._id, plotNumber: 'Plot-103', sizeSqFt: 1800, ratePerSqFt: 2600, totalPrice: 4680000, dimension: '30x60', facing: 'West', status: 'booked', createdBy: userAdmin._id },
    { projectId: project1._id, plotNumber: 'Plot-104', sizeSqFt: 2400, ratePerSqFt: 2700, totalPrice: 6480000, dimension: '40x60', facing: 'North-East', status: 'available', createdBy: userAdmin._id },
    { projectId: project1._id, plotNumber: 'Plot-105', sizeSqFt: 1500, ratePerSqFt: 2500, totalPrice: 3750000, dimension: '30x50', facing: 'East', status: 'available', createdBy: userAdmin._id },
    { projectId: project2._id, plotNumber: 'Plot-201', sizeSqFt: 1600, ratePerSqFt: 3000, totalPrice: 4800000, dimension: '32x50', facing: 'East', status: 'booked', createdBy: userAdmin._id },
    { projectId: project2._id, plotNumber: 'Plot-202', sizeSqFt: 2200, ratePerSqFt: 3100, totalPrice: 6820000, dimension: '44x50', facing: 'North', status: 'available', createdBy: userAdmin._id },
    { projectId: project3._id, plotNumber: 'Plot-301', sizeSqFt: 1200, ratePerSqFt: 2200, totalPrice: 2640000, dimension: '30x40', facing: 'East', status: 'booked', createdBy: userAdmin._id },
    { projectId: project3._id, plotNumber: 'Plot-302', sizeSqFt: 1500, ratePerSqFt: 2250, totalPrice: 3375000, dimension: '30x50', facing: 'North', status: 'available', createdBy: userAdmin._id },
    { projectId: project4._id, plotNumber: 'Plot-401', sizeSqFt: 1500, ratePerSqFt: 2400, totalPrice: 3600000, dimension: '30x50', facing: 'East', status: 'booked', createdBy: userAdmin._id },
  ];
  const plots = await Plot.insertMany(plotsData);
  const plotMap = {};
  plots.forEach((p) => { plotMap[p.plotNumber] = p; });

  console.log('Creating customers...');
  const customersData = [
    { name: 'Rameshwar Solanki', phone: '9826011223', email: 'rameshwar.solanki@gmail.com', city: 'Indore', panNumber: 'ABCDE1234F', aadhaarNumber: '123456789012', createdBy: userSalesAmit._id },
    { name: 'Dr. Anand Patwardhan', phone: '9827012345', email: 'anand.patwardhan@yahoo.com', city: 'Indore', panNumber: 'FGHIJ5678K', aadhaarNumber: '234567890123', createdBy: userDirectSalesNeha._id },
    { name: 'Sunil & Sunita Sharma', phone: '9826098765', email: 'sunil.sharma@outlook.com', city: 'Indore', panNumber: 'KLMNO9012P', aadhaarNumber: '345678901234', createdBy: userSalesSneha._id },
    { name: 'Manorama Devi Agrawal', phone: '9826123456', email: 'manorama.agrawal@gmail.com', city: 'Indore', panNumber: 'QRSTU3456V', aadhaarNumber: '456789012345', createdBy: userDirectorRajesh._id },
    { name: 'Rajendra Prasad Soni', phone: '9827112233', email: 'rajendra.soni@gmail.com', city: 'Ujjain', panNumber: 'UVWXY7890Z', aadhaarNumber: '567890123456', createdBy: userSalesPooja._id },
  ];
  const customers = await Customer.insertMany(customersData);

  console.log('Creating relational bookings and upward-walk incentives...');
  // Booking 1 (Registry status)
  const booking1 = await Booking.create({
    bookingNumber: 'BK-MN39-101', plotId: plotMap['Plot-101']._id, projectId: project1._id, customerId: customers[0]._id, sellerId: userSalesAmit._id,
    bookingAmount: 500000, totalPlotValue: plotMap['Plot-101'].totalPrice, paymentMode: 'Cheque', status: 'registry', activatedAt: new Date(Date.now() - 30 * 86400000), createdBy: userSalesAmit._id,
  });
  await calculateAndCreateIncentives(booking1._id);
  await Incentive.updateMany({ bookingId: booking1._id }, { $set: { status: 'approved', currentApproverId: null, 'approvalChain.$[].status': 'approved' } });
  await generatePayoutsForApprovedBooking(booking1._id);

  await Registry.create({
    bookingId: booking1._id, plotId: plotMap['Plot-101']._id, customerId: customers[0]._id, sellerId: userSalesAmit._id,
    registryNumber: 'REG-IND-2026-00452', registryDate: new Date(Date.now() - 10 * 86400000), registryOffice: 'Sub-Registrar Office - 1, Indore', stampDutyAmount: 262500, status: 'completed', createdBy: userSalesAmit._id,
  });

  // Booking 2 (Active status)
  const booking2 = await Booking.create({
    bookingNumber: 'BK-MN39-102', plotId: plotMap['Plot-102']._id, projectId: project1._id, customerId: customers[1]._id, sellerId: userDirectSalesNeha._id,
    bookingAmount: 750000, totalPlotValue: plotMap['Plot-102'].totalPrice, paymentMode: 'NEFT/RTGS', status: 'active', activatedAt: new Date(Date.now() - 3 * 86400000), createdBy: userDirectSalesNeha._id,
  });
  await calculateAndCreateIncentives(booking2._id);

  console.log('Relational seeding complete!');
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
