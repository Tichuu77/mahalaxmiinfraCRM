# Mahalaxmi Infra — Plot Sales CRM

An enterprise-grade, hierarchy-driven Plot Sales CRM built for **Mahalaxmi Infra** according to the Research & Requirement Document (RND - September 2026).

---

## Tech Stack

- **Framework**: Next.js 14 (App Router) — Single standalone application with internal API routes
- **Language**: JavaScript (`.js`) & JSX (`.jsx`) exclusively
- **Database & ORM**: MongoDB with Mongoose (with cached singleton connection)
- **Styling**: Tailwind CSS & Lucide Icons
- **State & Data Fetching**: TanStack Query (React Query v5) & Zustand
- **Form & Validation**: React Hook Form & Zod
- **Queues & Jobs**: Redis & BullMQ (with resilient inline fallback runner when Redis is offline)
- **Document Generation**: Official Mahalaxmi Infra Commission Bill PDF generator (jsPDF & autoTable)

---

## Key Features Implemented (From RND Specification)

1. **Dynamic Role & Unlimited Hierarchy Engine (Section 2)**:
   - Dynamic Roles stored as data: `Role Name`, `Rank` (Admin=0, Director=1, Manager=2, Sales Person=3, etc.), `Seller Rate (₹/sq.ft.)`, and `Override Rate (₹/sq.ft.)`. New roles can be created and inserted at any rank without code changes.
   - Self-referencing User tree (`reportsTo` User lookup) with unlimited depth.
   - Dual-Role Leadership / Mixed Teams: Leaders can manage subordinate leaders and direct sales persons simultaneously.
   - Hierarchy permissions: Users can create/view/edit/activate/deactivate/soft-delete and reset passwords for accounts in their downline at ranks below their own.

2. **Plot Selling & Generalized Incentive Engine (Section 3 & 4)**:
   - Any user at any level can book a plot.
   - Activating a booking automatically triggers the upward-walk incentive engine:
     - Seller gets: `Plot Size (sq.ft.) × role.sellerRate`.
     - Each upline ancestor gets: `Plot Size (sq.ft.) × role.overrideRate`.
   - Dynamic Sequential Approval Workflow: Moves sequentially up the chain from immediate manager to Admin. Rejection halts the chain; cancellation voids incentives.

3. **Data Visibility & Scoped Views (Section 5 & 5.1)**:
   - Database-level downline filtering on Customers, Bookings, Registries, Incentives, and Payouts.
   - **Deliberate Inventory Exception**: Projects and Plots are shared group-wide inventory visible to all users across all branches. Only Admin can create/edit/delete projects and plots.

4. **Registry Tracking (Section 6)**:
   - Tracks plot registry numbers, dates, and offices.
   - Marking completed updates Plot to `registered`, Booking to `registry`, and notifies the creator and entire upline to Admin.

5. **Payout Disbursement & Official PDF Bill Generation (Section 7)**:
   - Generated upon full approval of incentives.
   - Generates official Mahalaxmi Infra PDF Commission Bills featuring company header, project details (e.g. "Mahalaxmi Nagar 39"), plot specifications, and dynamic advisor rows listing every recipient in the upline chain.

6. **Scoped Dashboards & Analytics (Section 8)**:
   - Downline-scoped KPI metrics: Total Projects, Total Plots, Bookings, Registries, Downline Revenue, Personal Approved & Paid Earnings, Pending Approvals, and Top Performers Board.

---

## Quick Start Guide

### 1. Prerequisites
- Node.js (v18+)
- MongoDB (Running locally on `mongodb://127.0.0.1:27017/mahalaxmi_crm` or a cloud MongoDB Atlas URI)
- Redis (Optional: if Redis is running, BullMQ processes jobs asynchronously; if Redis is offline, jobs execute resiliently inline)

### 2. Configure Environment
Copy `.env.local`:
```env
MONGODB_URI=mongodb://127.0.0.1:27017/mahalaxmi_crm
JWT_SECRET=mahalaxmi_infra_super_secret_jwt_key_2026_plot_sales
REDIS_URL=redis://127.0.0.1:6379
```

*(Optional)* Run MongoDB and Redis using Docker:
```bash
docker compose up -d
```

### 3. Run Application
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

### 4. Seed Database
On the login screen (`http://localhost:3000`), click **"Seed / Reset Database"** (or call `/api/seed`), which automatically populates:
- Dynamic Roles (Admin, Director, Manager, Sales Person)
- 4-Tier Sample Hierarchy with Mixed Teams
- Shared Projects ("Mahalaxmi Nagar 39", "Mahalaxmi Elite Enclave")
- Plot Inventory (sizes from 1,500 to 3,000 sq.ft.)
- Sample Customer & an Active Booking with calculated incentives

### 5. Test Credentials (Password: `Password@123`)
| Role | Email | Scope / Capability |
|---|---|---|
| **Admin (Rank 0)** | `admin@mahalaxmi.com` | Full enterprise authority, role management, project CRUD |
| **Director (Rank 1)** | `rajesh.director@mahalaxmi.com` | Downline branch authority, mixed team |
| **Manager (Rank 2)** | `vikram.manager@mahalaxmi.com` | Supervises sales executives |
| **Sales Person (Rank 3)** | `amit.sales@mahalaxmi.com` | Direct seller under Vikram |
| **Direct Sales (Rank 3)** | `neha.sales@mahalaxmi.com` | Mixed team: reports directly to Director Rajesh |
