# Salem Montessori Volunteer Portal

A production-ready volunteer management system for Salem Montessori School with GoHighLevel integration, email notifications, and complete admin/parent functionality.

## Features

### Parent Portal
- Self-registration and authentication
- Visual progress ring showing volunteer hours (completed vs required)
- Browse and sign up for volunteer opportunities with real-time slot tracking
- Cancel signups with slot restoration
- Volunteer history with attendance status
- Profile management
- Email notifications (welcome, signup confirmation, reminders, thank you, milestones)

### Admin Portal
- Statistics dashboard with hour distribution charts
- Create, edit, duplicate, and delete volunteer opportunities
- View signups per event and mark attendance (individual or bulk)
- Automatic hour calculation on attendance marking
- Parent management with inline hour editing
- Broadcast email system (all parents, event-specific, low-hours filter)
- CSV export for parents and signups
- GHL integration settings
- Configurable school settings

### GoHighLevel Integration
- Auto-create/update GHL contacts on parent registration
- Sync volunteer hours to custom fields on attendance marking
- Tag management (active, complete, milestones)
- Graceful degradation when GHL is unavailable

### Email System
- 7 email templates: Welcome, Signup Confirmation, Reminder (24hr cron), Thank You, Cancellation, Milestone (5/10/15/20 hrs), Admin Broadcast
- Template variables: {parent_name}, {hours_remaining}, {school_name}
- Branded HTML emails with Salem Montessori styling

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 14 (App Router), React 18, TailwindCSS |
| Backend | Next.js API Routes |
| Database | PostgreSQL |
| Auth | NextAuth.js (JWT, 7-day sessions) |
| Email | Nodemailer (SMTP / Resend) |
| GHL | GoHighLevel API v2 |
| Validation | Zod |
| Deployment | Vercel + Supabase/Railway (DB) |

---

## Quick Start

### 1. Clone and Install

```bash
git clone <repo-url>
cd volunteer-portal
npm install
```

### 2. Set Up Database

Create a PostgreSQL database (Supabase, Railway, Neon, or local).

### 3. Configure Environment

```bash
cp .env.example .env
```

Edit `.env` with your values:

```env
# Database - your PostgreSQL connection string
DATABASE_URL=postgresql://user:password@host:5432/volunteer_portal

# NextAuth - CHANGE THE SECRET
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=generate-a-random-secret-here-minimum-32-chars

# GoHighLevel (optional - system works without it)
GHL_API_KEY=your-ghl-api-key
GHL_LOCATION_ID=your-ghl-location-id

# Email (Resend recommended)
SMTP_HOST=smtp.resend.com
SMTP_PORT=465
SMTP_USER=resend
SMTP_PASSWORD=re_your_api_key
EMAIL_FROM=volunteers@salemmontessori.com
EMAIL_FROM_NAME=Salem Montessori School

# App
APP_URL=http://localhost:3000
SCHOOL_NAME=Salem Montessori School
```

### 4. Run Migrations and Seed

```bash
npm run db:migrate    # Creates all tables and indexes
npm run db:seed       # Creates admin account + sample data
```

The seed script will output credentials:
```
Admin:  admin@salemmontessori.com / SalemAdmin2024!
Parent: parent@example.com / Parent2024!
```

### 5. Start Development Server

```bash
npm run dev
```

Visit `http://localhost:3000`

---

## Deployment to Vercel

### Step 1: Database Setup

**Option A: Supabase (Recommended)**
1. Create project at supabase.com
2. Go to Settings → Database → Connection string
3. Copy the `URI` connection string

**Option B: Railway**
1. Create project at railway.app
2. Add PostgreSQL plugin
3. Copy connection string from Variables tab

**Option C: Neon**
1. Create project at neon.tech
2. Copy the connection string

### Step 2: Deploy to Vercel

1. Push code to GitHub
2. Import project at vercel.com/new
3. Set environment variables in Vercel dashboard:
   - All variables from `.env.example`
   - Set `NEXTAUTH_URL` to your production domain
   - Generate a secure `NEXTAUTH_SECRET` (`openssl rand -base64 32`)
4. Deploy

### Step 3: Run Migrations on Production

```bash
# Set DATABASE_URL to production database
DATABASE_URL=your-production-url npm run db:migrate
DATABASE_URL=your-production-url npm run db:seed
```

### Step 4: Configure Domain

1. Add custom domain in Vercel: `volunteers.salemmontessori.com`
2. Update DNS with your registrar
3. Update `NEXTAUTH_URL` in Vercel to match

### Step 5: Configure Email

**Using Resend:**
1. Sign up at resend.com
2. Add and verify your domain
3. Create API key
4. Set `SMTP_PASSWORD` to the API key

**Using custom SMTP:**
1. Set `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`
2. Set `EMAIL_FROM` to your verified sender address

### Step 6: Cron Job (Reminders)

Vercel Cron is configured in `vercel.json` to run daily at 8 AM:
```json
{
  "crons": [{ "path": "/api/cron/send-reminders", "schedule": "0 8 * * *" }]
}
```

Set `CRON_SECRET` env var for security, or remove the auth check for Vercel's built-in cron.

---

## GoHighLevel Setup

### 1. Create Custom Fields in GHL

In your GHL location, create these custom fields:
- `volunteer_hours_completed` (Number)
- `volunteer_hours_required` (Number, default 20)
- `volunteer_hours_remaining` (Number)
- `last_volunteer_date` (Date)
- `student_names` (Text)
- `parent_portal_id` (Text)
- `volunteer_portal_registered` (Date)

### 2. Get API Credentials

1. Go to Settings → Integrations → API Keys
2. Create a new API key with Contacts access
3. Copy the API key and Location ID

### 3. Configure in Admin Portal

1. Log in as admin
2. Go to Settings
3. Enter GHL API Key and Location ID
4. Save

### Tags Created Automatically
- `volunteer_portal_active` — on registration
- `volunteer_hours_complete` — when requirement met
- `volunteer_milestone_5hrs` / `10hrs` / `15hrs` / `20hrs` — on milestones

---

## Admin Guide

### Creating Opportunities
1. Go to **Opportunities → + New Opportunity**
2. Fill in title, description, date, time, location, hours credit, slots
3. Click **Create Opportunity** — it appears in the parent portal immediately
4. Use **Duplicate** button to quickly create recurring events

### Managing Signups & Attendance
1. Go to **Opportunities** → click **Signups (N)** on any event
2. View all signed-up parents with their contact details
3. Click **Mark Attended** for each parent who showed up
4. Or click **Mark All Attended** for bulk marking
5. Hours are automatically added to parent totals
6. Thank you emails are sent automatically
7. GHL contacts are updated automatically
8. Export signup list to CSV with the **Export CSV** button

### Managing Parents
1. Go to **Parents** to see all registered parents
2. Search by name, email, or student name
3. Click any parent's hours to manually edit
4. Click **View Details** for full history
5. Export all parent data to CSV

### Sending Broadcasts
1. Go to **Broadcast**
2. Choose target: All Parents, Event-Specific, or Low Hours
3. Write subject and message (use variables for personalization)
4. Click **Send Broadcast**

### Settings
- Update school name and required hours per year
- Configure GHL API credentials
- Set email reminder timing

---

## Parent Guide

### Registration
1. Visit the portal URL
2. Click **Register**
3. Enter your name, email, phone, student names, and password
4. You'll receive a welcome email

### Signing Up for Events
1. Log in and go to **Opportunities**
2. Browse available events (shows date, time, location, hours, spots left)
3. Click **Sign Up** and confirm
4. You'll receive a confirmation email
5. You'll get a reminder email 24 hours before the event

### Tracking Progress
- Your **Dashboard** shows a progress ring with hours completed vs required
- View upcoming events you're signed up for
- See your volunteer history with hours credited
- Once admin marks your attendance, hours are automatically added

### Profile
- Update your name, phone, and student names from the **Profile** page

---

## File Structure

```
volunteer-portal/
├── app/
│   ├── (auth)/          # Login, Register pages
│   ├── (parent)/        # Parent dashboard, opportunities, history, profile
│   ├── (admin)/         # Admin dashboard, opportunities, parents, broadcast, settings
│   ├── api/
│   │   ├── auth/        # NextAuth + registration
│   │   ├── parent/      # Parent dashboard, opportunities, signup, profile
│   │   ├── admin/       # Opportunities CRUD, signups, parents, broadcast, stats, export
│   │   ├── ghl/         # GHL sync endpoints
│   │   └── cron/        # Reminder email cron
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx         # Root redirect
├── components/
│   ├── ui/              # Loading, Toast, ConfirmDialog, EmptyState
│   ├── parent/          # ProgressRing, ParentNav
│   ├── admin/           # AdminNav, OpportunityForm
│   └── shared/          # SessionProvider
├── lib/
│   ├── auth/            # NextAuth config
│   ├── db/              # Database queries (parents, opportunities, schools)
│   ├── email/           # Email templates and sending
│   ├── ghl/             # GoHighLevel API client
│   └── utils.ts         # Utility functions
├── scripts/
│   ├── migrate.js       # Create tables
│   ├── seed.js          # Seed admin + sample data
│   └── reset.js         # Drop all tables
├── types/               # TypeScript type definitions
├── middleware.ts         # Route protection
└── package.json
```

---

## Database Schema

- **schools** — School config, admin credentials, GHL settings
- **parents** — Parent accounts, hours tracking, GHL contact ID
- **volunteer_opportunities** — Events with slots, hours credit, dates
- **signups** — Parent-to-opportunity mapping with attendance tracking
- **email_logs** — Email send history
- **admin_settings** — Key-value settings store

Key design decisions:
- UUID primary keys for security
- Database transactions for signup (prevents overbooking) and attendance (atomic hour updates)
- Indexes on all foreign keys and frequently queried columns
- Unique constraints prevent double signups

---

## Security

- Bcrypt password hashing (12 rounds)
- JWT sessions with 7-day expiration
- Route-level protection via NextAuth middleware
- Role-based access (parent vs admin)
- Parameterized SQL queries (SQL injection prevention)
- Input validation with Zod on all API routes
- GHL API key stored in database (should be encrypted in production)

---

## Troubleshooting

| Issue | Solution |
|-------|---------|
| "School not configured" on registration | Run `npm run db:seed` |
| Emails not sending | Check SMTP credentials in `.env` |
| GHL sync failing | Verify API key and Location ID in admin settings |
| "Unauthorized" on pages | Clear cookies, check `NEXTAUTH_SECRET` matches |
| Migration fails | Ensure `DATABASE_URL` is correct and database exists |
| Slots going negative | Database transactions prevent this; check for manual DB edits |

---

## Environment Variables Reference

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `NEXTAUTH_URL` | Yes | App URL (http://localhost:3000 or production URL) |
| `NEXTAUTH_SECRET` | Yes | Random secret for JWT signing |
| `GHL_API_KEY` | No | GoHighLevel API key |
| `GHL_LOCATION_ID` | No | GoHighLevel location ID |
| `SMTP_HOST` | Yes | SMTP server hostname |
| `SMTP_PORT` | Yes | SMTP port (465 for SSL) |
| `SMTP_USER` | Yes | SMTP username |
| `SMTP_PASSWORD` | Yes | SMTP password or API key |
| `EMAIL_FROM` | Yes | Sender email address |
| `EMAIL_FROM_NAME` | No | Sender display name |
| `APP_URL` | Yes | Public app URL (for email links) |
| `SCHOOL_NAME` | No | School name (default: Salem Montessori School) |
| `CRON_SECRET` | No | Secret for cron endpoint auth |
