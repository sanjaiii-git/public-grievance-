# Public Grievance Redressal System

A citizen-centric grievance management platform with GIS-based location tracking, built with **Next.js 14**, **TypeScript**, **Supabase**, and **Leaflet Maps**.

## Features

- **Role-Based Access Control** — Citizen, Admin, Super Admin dashboards
- **Grievance Submission** — Citizens can file complaints with photo evidence & map location
- **GIS Integration** — Interactive maps for pinpointing grievance locations (Leaflet + OSM)
- **Real-Time Tracking** — Track grievance status with timeline updates
- **Feedback System** — Citizens can rate resolved grievances
- **Department Routing** — Complaints auto-routed to the correct department admin

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 14, React 18, TypeScript |
| Styling | Tailwind CSS |
| Backend | Supabase (Auth, Database, Storage) |
| Maps | Leaflet, React-Leaflet, OpenStreetMap |
| Icons | Lucide React |

## Quick Start

### 1. Clone & Install

```bash
git clone https://github.com/YOUR_USERNAME/public-grievance.git
cd public-grievance
npm install
```

### 2. Configure Environment

```bash
cp .env.example .env.local
```

Edit `.env.local` with your Supabase credentials (Settings → API in Supabase dashboard).

### 3. Set Up Database

Run the SQL files in Supabase SQL Editor **in this order**:
1. `supabase/schema.sql` — Core tables & RLS policies
2. `supabase/grievance_schema.sql` — Grievance tables
3. `supabase/gis_schema.sql` — GIS/location tables
4. `supabase/storage_policies.sql` — File upload policies
5. `supabase/add_signup_policies.sql` — Signup RLS
6. `supabase/fix_login_rls.sql` — Login fixes
7. `supabase/department_flow_fix.sql` — Department routing

### 4. Run

```bash
npm run dev
```

Open **http://localhost:3000**

## User Roles

| Role | Signup URL | Login ID Format |
|------|-----------|----------------|
| Citizen | `/signup` | Username or Aadhaar |
| Admin | `/signup/admin` | `department.admin.com` |
| Super Admin | `/signup/superadmin` | `name.superadmin.com` |

## Project Structure

```
src/
├── app/
│   ├── page.tsx                          # Landing page
│   ├── login/page.tsx                    # Login (all roles)
│   ├── signup/                           # Signup pages
│   └── dashboard/
│       ├── citizen/                      # Citizen dashboard
│       │   ├── page.tsx                  # Overview
│       │   ├── submit/page.tsx           # File grievance
│       │   ├── track/page.tsx            # Track grievances
│       │   ├── complaints/page.tsx       # Complaint history
│       │   ├── feedback/page.tsx         # Rate resolutions
│       │   └── profile/page.tsx          # User profile
│       ├── admin/page.tsx                # Admin dashboard
│       └── superadmin/page.tsx           # Super Admin dashboard
├── components/
│   ├── MapPicker.tsx                     # Interactive map for location selection
│   └── MapView.tsx                       # Map display component
└── lib/
    ├── supabase.ts                       # Supabase client
    ├── gis.ts                            # GIS utilities
    └── utils.ts                          # Helpers
supabase/                                 # Database migration SQL files
```

## Deployment

This project is deployed on **Vercel**. To deploy your own:

1. Push to GitHub
2. Import the repo on [vercel.com](https://vercel.com)
3. Add environment variables (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`)
4. Deploy

## License

All rights reserved.
