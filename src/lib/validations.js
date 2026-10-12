import { z } from 'zod';

export const LoginSchema = z.object({
  email: z.string().email('Valid email address is required'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

export const RoleSchema = z.object({
  name: z.string().min(2, 'Role name is required'),
  rank: z.coerce.number().min(0, 'Rank must be 0 or higher'),
  sellerRate: z.coerce.number().min(0, 'Seller rate must be positive'),
  overrideRate: z.coerce.number().min(0, 'Override rate must be positive'),
  isRoot: z.boolean().optional().default(false),
});

export const UserCreateSchema = z.object({
  name: z.string().min(2, 'Name is required'),
  email: z.string().email('Valid email is required'),
  phone: z.string().min(10, 'Valid 10-digit phone number is required'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  roleId: z.string().min(1, 'Role is required'),
  reportsTo: z.string().nullable().optional(),
});

export const UserUpdateSchema = z.object({
  name: z.string().min(2, 'Name is required').optional(),
  email: z.string().email('Valid email is required').optional(),
  phone: z.string().min(10, 'Valid phone number is required').optional(),
  roleId: z.string().min(1, 'Role is required').optional(),
  reportsTo: z.string().nullable().optional(),
  status: z.enum(['active', 'inactive']).optional(),
  password: z.string().min(6).optional(),
});

export const ProjectSchema = z.object({
  name: z.string().min(2, 'Project name is required'),
  code: z.string().min(2, 'Project code is required'),
  location: z.string().min(2, 'Location is required'),
  totalAreaSqFt: z.coerce.number().min(0).optional().default(0),
  description: z.string().optional().default(''),
  status: z.enum(['active', 'completed', 'upcoming']).optional().default('active'),
});

export const PlotSchema = z.object({
  projectId: z.string().min(1, 'Project is required'),
  plotNumber: z.string().min(1, 'Plot number is required'),
  sizeSqFt: z.coerce.number().min(1, 'Size in sq. ft. is required'),
  ratePerSqFt: z.coerce.number().min(0, 'Rate per sq. ft. is required'),
  dimension: z.string().optional().default(''),
  facing: z.enum(['East', 'West', 'North', 'South', 'North-East', 'North-West', 'South-East', 'South-West', 'Other']).optional().default('East'),
  status: z.enum(['available', 'reserved', 'booked', 'registered', 'cancelled']).optional().default('available'),
});

export const CustomerSchema = z.object({
  name: z.string().min(2, 'Customer name is required'),
  phone: z.string().min(10, 'Valid phone number is required'),
  email: z.string().email().optional().or(z.literal('')),
  address: z.string().optional().default(''),
  city: z.string().optional().default(''),
  panNumber: z
    .string()
    .optional()
    .default('')
    .transform((val) => (val ? val.trim().toUpperCase() : '')),
  aadhaarNumber: z
    .string({ required_error: 'Aadhaar number is required' })
    .trim()
    .min(1, 'Aadhaar number is required')
    .refine((val) => /^\d{12}$/.test(val.replace(/\s+/g, '')), {
      message: 'Valid 12-digit Aadhaar number is required',
    })
    .transform((val) => val.replace(/\s+/g, '')),
});

export const BookingSchema = z.object({
  plotId: z.string().min(1, 'Plot is required'),
  projectId: z.string().min(1, 'Project is required'),
  customerId: z.string().min(1, 'Customer is required'),
  bookingAmount: z.coerce.number().min(0, 'Booking amount is required'),
  paymentMode: z.enum(['Cheque', 'NEFT/RTGS', 'UPI', 'Cash', 'Demand Draft']).default('Cheque'),
  transactionReference: z.string().optional().default(''),
  notes: z.string().optional().default(''),
});

export const RegistrySchema = z.object({
  bookingId: z.string().min(1, 'Booking is required'),
  registryNumber: z.string().min(1, 'Registry document number is required'),
  registryDate: z.string().min(1, 'Registry date is required'),
  registryOffice: z.string().optional().default(''),
  stampDutyAmount: z.coerce.number().optional().default(0),
  remarks: z.string().optional().default(''),
});

export const ApprovalActionSchema = z.object({
  bookingId: z.string().min(1, 'Booking ID is required'),
  decision: z.enum(['approved', 'rejected']),
  comments: z.string().optional().default(''),
});
