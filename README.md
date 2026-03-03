<p align="center">
  <img src="https://img.shields.io/badge/Next.js-14-black?style=for-the-badge&logo=next.js" alt="Next.js 14" />
  <img src="https://img.shields.io/badge/TypeScript-5.3-3178C6?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Supabase-RLS%20Secured-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white" alt="Supabase" />
  <img src="https://img.shields.io/badge/Tailwind%20CSS-3.4-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white" alt="Tailwind CSS" />
  <img src="https://img.shields.io/badge/Leaflet-GIS%20Maps-199900?style=for-the-badge&logo=leaflet&logoColor=white" alt="Leaflet" />
</p>

# 🏛️ Public Grievance Redressal System

> A production-grade, citizen-centric grievance management platform with **GIS-based location intelligence**, **AI-powered priority scoring**, **real-time SLA tracking**, and **multi-language support** — built for smart city governance.

---

## ✨ Key Features

### 🎯 Core Platform
- **Role-Based Access Control** — Citizen, Department Admin, and Super Admin dashboards with distinct capabilities
- **Grievance Lifecycle** — Submit → Auto-Route → Assign → Track → Resolve → Feedback — fully managed pipeline
- **Real-Time SLA Engine** — Per-department SLA calculations with automatic escalation on breach
- **Evidence Upload** — Photo/document attachment via Supabase Storage with RLS-secured access

### 🗺️ GIS & Location Intelligence
- **Interactive Map Picker** — Click-to-select + GPS auto-detect + address search (Leaflet + OpenStreetMap)
- **Reverse Geocoding** — Automatic ward/zone/city detection from pin coordinates (Nominatim API)
- **Complaint Heatmaps** — Spatial clustering to identify grievance hotspots
- **Department Office Proximity** — Find nearest department office using Haversine distance
- **Ward & Zone Analytics** — Geospatial aggregation for administrative insights

### 🤖 AI & Automation
- **Smart Priority Scoring** — Rule-based NLP engine analyzing 7 keyword categories, department criticality, description detail, and urgency tone — generates 0–100 priority score (Critical / High / Medium / Low)
- **Multi-Language Detection** — Automatic Unicode script detection for Tamil, Hindi, Telugu, Kannada, Malayalam, Bengali, Gujarati
- **Real-Time Translation** — MyMemory API integration for regional language → English translation
- **Auto Department Routing** — Complaints routed to the correct department admin based on category

### 🔒 Security & Architecture
- **Row-Level Security (RLS)** — Every table protected with Supabase RLS policies; citizens see only their own data
- **SECURITY DEFINER Functions** — Login lookups bypass RLS safely via server-side PostgreSQL functions
- **SHA-256 Hashing** — Aadhaar numbers hashed client-side before any comparison
- **Session-Based Auth** — Supabase Auth with role-aware session management

---

## 🏗️ System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLIENT (Next.js 14)                       │
│  ┌──────────┐  ┌──────────┐  ┌─────────────┐  ┌──────────────┐  │
│  │ Citizen   │  │ Admin    │  │ Super Admin │  │ Auth Pages   │  │
│  │ Dashboard │  │ Dashboard│  │ Dashboard   │  │ Login/Signup │  │
│  └─────┬────┘  └────┬─────┘  └──────┬──────┘  └──────┬───────┘  │
│        │             │               │                │          │
│  ┌─────┴─────────────┴───────────────┴────────────────┴───────┐  │
│  │                    Shared Components                        │  │
│  │  MapPicker · MapView · GIS Utils · AI Priority Engine      │  │
│  └─────────────────────────┬──────────────────────────────────┘  │
└────────────────────────────┼─────────────────────────────────────┘
                             │ Supabase Client SDK
┌────────────────────────────┼─────────────────────────────────────┐
│                     SUPABASE BACKEND                              │
│  ┌──────────┐  ┌───────────┐  ┌────────────┐  ┌──────────────┐  │
│  │ Auth     │  │ PostgreSQL│  │ Storage    │  │ RPC Functions│  │
│  │ (JWT)    │  │ + RLS     │  │ (Evidence) │  │ (SECURITY    │  │
│  │          │  │ + PostGIS │  │            │  │  DEFINER)    │  │
│  └──────────┘  └───────────┘  └────────────┘  └──────────────┘  │
│                                                                   │
│  Tables: citizens · admins · superadmins · grievances ·           │
│          grievance_timeline · feedback · wards · zones ·          │
│          department_offices · hotspots                             │
└───────────────────────────────────────────────────────────────────┘
```

---

## 📁 Project Structure

```
public-grievance/
├── src/
│   ├── app/
│   │   ├── page.tsx                          # Landing page
│   │   ├── layout.tsx                        # Root layout + SEO metadata
│   │   ├── not-found.tsx                     # Custom 404 page
│   │   ├── loading.tsx                       # Global loading skeleton
│   │   ├── login/page.tsx                    # Multi-role authentication
│   │   ├── signup/                           # Role-specific registration
│   │   │   ├── page.tsx                      #   Citizen signup
│   │   │   ├── admin/page.tsx                #   Admin signup
│   │   │   └── superadmin/page.tsx           #   Super Admin signup
│   │   └── dashboard/
│   │       ├── citizen/                      # Citizen portal (8 routes)
│   │       │   ├── layout.tsx                #   Sidebar + auth guard
│   │       │   ├── page.tsx                  #   Stats overview
│   │       │   ├── submit/page.tsx           #   File grievance + GIS map
│   │       │   ├── track/page.tsx            #   Search & filter
│   │       │   ├── track/[id]/page.tsx       #   Complaint detail + timeline
│   │       │   ├── complaints/page.tsx       #   Full complaint history
│   │       │   ├── feedback/page.tsx         #   Rate resolutions
│   │       │   └── profile/page.tsx          #   User profile
│   │       ├── admin/page.tsx                # Department Admin panel
│   │       └── superadmin/page.tsx           # Super Admin analytics
│   ├── components/
│   │   ├── MapPicker.tsx                     # Interactive location selector
│   │   └── MapView.tsx                       # Complaint map visualizer
│   ├── lib/
│   │   ├── supabase.ts                       # Supabase client + types
│   │   ├── gis.ts                            # GIS utilities & geocoding
│   │   └── utils.ts                          # AI scoring, SLA, translations
│   └── types/
│       └── index.ts                          # Shared TypeScript interfaces
├── supabase/                                 # Database migrations (7 files)
│   ├── schema.sql                            # Core tables + RLS
│   ├── grievance_schema.sql                  # Grievance tables + triggers
│   ├── gis_schema.sql                        # GIS tables + spatial functions
│   ├── storage_policies.sql                  # Evidence upload policies
│   ├── add_signup_policies.sql               # Signup RLS policies
│   ├── fix_login_rls.sql                     # SECURITY DEFINER login RPCs
│   └── department_flow_fix.sql               # Department routing fixes
├── .env.example                              # Environment variable template
├── .gitignore
├── CONTRIBUTING.md                           # Contribution guidelines
├── LICENSE                                   # MIT License
└── package.json
```

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** ≥ 18.x
- **npm** ≥ 9.x
- A free [Supabase](https://supabase.com/dashboard) project

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

Add your Supabase credentials from **Settings → API** in the [Supabase Dashboard](https://supabase.com/dashboard):

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

### 3. Database Setup

Run the SQL migration files in the **Supabase SQL Editor** in order:

| # | File | Purpose |
|:-:|------|---------|
| 1 | `supabase/schema.sql` | Core user tables, RLS policies, indexes |
| 2 | `supabase/grievance_schema.sql` | Grievance tables, auto-ID generator, timeline triggers |
| 3 | `supabase/gis_schema.sql` | GIS tables, spatial functions, ward/zone analytics |
| 4 | `supabase/storage_policies.sql` | Evidence storage bucket & access policies |
| 5 | `supabase/add_signup_policies.sql` | INSERT policies for admin/superadmin signup |
| 6 | `supabase/fix_login_rls.sql` | SECURITY DEFINER login lookup functions |
| 7 | `supabase/department_flow_fix.sql` | Department routing & admin timeline policies |

### 4. Run

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## 👥 User Roles

| Role | Access | Signup | Login Format |
|------|--------|-------|--------------|
| **Citizen** | Submit grievances, track status, give feedback | `/signup` | Username or Aadhaar |
| **Admin** | Manage department complaints, update status, respond | `/signup/admin` | `department.admin.com` |
| **Super Admin** | Cross-department analytics, escalation management | `/signup/superadmin` | `name.superadmin.com` |

---

## 🔧 Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Framework** | Next.js 14 (App Router) | SSR, file-based routing, React Server Components |
| **Language** | TypeScript 5.3 | Full type safety across the codebase |
| **Styling** | Tailwind CSS 3.4 | Utility-first responsive design |
| **Backend** | Supabase | Auth, PostgreSQL, Storage, Row-Level Security |
| **Maps** | Leaflet + React-Leaflet | Interactive GIS maps with OpenStreetMap tiles |
| **Geocoding** | Nominatim (OSM) | Reverse geocoding — free, no API key required |
| **Translation** | MyMemory API | Free multi-language translation |
| **Icons** | Lucide React | Tree-shakable, consistent icon system |

---

## 📊 Database Schema

**7 core tables** with full Row-Level Security:

```
citizens            ← Citizen profiles (Aadhaar, phone, username)
admins              ← Department admins (department, admin_id)
superadmins         ← State-level super admins
grievances          ← Core complaints (30+ columns, GIS fields)
grievance_timeline  ← Status change audit log with timestamps
feedback            ← Citizen satisfaction ratings (1-5 stars)
wards / zones       ← Administrative geography boundaries
department_offices  ← Office locations for proximity calculations
hotspots            ← Auto-detected complaint cluster zones
```

### Key Database Features
- **Auto-generated complaint IDs** — `GRV-2026-000001` format
- **Automatic timeline entries** — Trigger-based on every status change
- **SLA deadline calculation** — Per-department SLA hours auto-applied
- **GIS columns** — `latitude`, `longitude`, `location_ward`, `location_zone` on grievances
- **10+ RPC functions** — Ward analytics, hotspot detection, nearest office finder

---

## 🌐 Deployment

### Vercel (Recommended)

1. Push to GitHub
2. Import at [vercel.com/new](https://vercel.com/new)
3. Set environment variables: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. Deploy

### Docker

```dockerfile
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:18-alpine AS runner
WORKDIR /app
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./
EXPOSE 3000
CMD ["npm", "start"]
```

---

## 🤝 Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for development setup, coding standards, and PR guidelines.

## 📜 License

This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.

---

<p align="center">
  Built with ❤️ for smarter city governance
</p>
