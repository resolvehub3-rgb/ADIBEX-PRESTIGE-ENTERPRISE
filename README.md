# ADIBEX PRESTIGE ENTERPRISE | ADIBEX PRESTIGE PROPERTIES

> **Motto:** *"Your Vision Our Mission"*  
> **Brand Identity:** Premier Real Estate Housing Management, Land Acquisition, Property Listings, Booking, Reservation & Payment Platform.

---

## 🏢 Overview

**ADIBEX PRESTIGE PROPERTIES** is a comprehensive, production-grade real estate software platform engineered for **ADIBEX PRESTIGE ENTERPRISE**. The system manages the full lifecycle of real estate transactions in Ghana and international markets, specializing in:

- 🛏️ **Room Rentals**: Single rooms, self-contained units, chamber and hall units, and executive flats.
- 🌍 **Titled Lands & Plots**: Verified, litigation-free residential, commercial, agricultural, and industrial land plots.
- 🏡 **Properties**: Luxury houses, townhouses, apartments, villas, and commercial spaces for rent and sale.

The platform is designed with strict enterprise security, real-time Supabase PostgreSQL database persistence, Row Level Security (RLS), multi-currency financial calculation, and high-performance search engine optimization (SEO).

---

## 🚀 Key Features

### 1. Dynamic SEO & Social Sharing Engine (`SEOManager`)
- **Dynamic Meta Updates**: Dynamically synchronizes document `<title>`, `<meta name="description">`, `<meta name="keywords">`, `<link rel="canonical">`, and robot directives whenever inspecting any room, land parcel, or property.
- **Open Graph & Twitter Cards**: Generates standard `og:title`, `og:description`, `og:image`, `og:url`, `og:type`, and Twitter large image cards for link previews on WhatsApp, Facebook, iMessage, and X/Twitter.
- **Schema.org Structured Data (JSON-LD)**: Injects rich structured microdata for search engines:
  - `RealEstateAgent` with contact information, service offers, and address.
  - `RealEstateListing` paired with specific classifications (`Accommodation` for rooms, `LandPlots` for land, `SingleFamilyResidence`/`Apartment` for properties).
  - `BreadcrumbList`, `ItemList`, and `FAQPage` rich snippets.
- **Search Engine Prioritization**: Built-in optimization strategies for Google, Safari (Applebot), Chrome, and Microsoft Edge targeting search terms for `room`, `lands`, and `properties`.
- **Deep-Link URL Resolution**: Browser URL queries (`/?property=[slug_or_id]`, `/?view=search&type=...`) ensure direct navigation from search results or social links.

### 2. Multi-Tier Role-Based Access Control (RBAC)
- **Company Owner / Admin** *(Highest Authority)*: Complete administrative control over properties, multi-unit configurations, payment approvals, reservation cancellations, staff accounts, company settings, and audit logs.
- **Real Estate Agent / Staff**: Access to assigned listings, viewing appointment calendar, customer inquiries, and inspection notes.
- **Valued Customer**: Account registration, saved favorites, instant reservation status, digital receipts, and scheduled tour management.

### 3. Real-Time Reservation & Unit Lock System
- **Time-Limited Reservation Lock**: Prevents double-booking by temporarily holding units during payment submission.
- **Instant Status Synchronization**: Updates unit and property states across `AVAILABLE`, `RESERVED`, `OCCUPIED`, and `SOLD`.
- **Automated Reference Generation**: Issues distinct booking codes (e.g., `ADX-RES-XXXXX`, `ADX-PAY-XXXXX`).

### 4. Financial & Payment Verification
- **Multiple Payment Channels**: Direct Mobile Money (MTN, Telecel, AT) and Bank Wire transfers.
- **Multi-Currency Pricing**: Real-time currency conversion across **GHS**, **USD**, **GBP**, and **EUR**.
- **Digital Receipts**: Printable, verifiable receipts displaying transaction details, customer identification, and company authorization stamps.

### 5. Inspection Tour Scheduling
- **In-Person & Virtual Viewings**: Clients can schedule property visits with preferred dates and time slots.
- **Agent Dispatch**: Assigns staff agents to conduct and verify physical site visits.

---

## 🛠️ Technology Stack

| Layer | Technology |
|---|---|
| **Frontend** | React 19, TypeScript, Vite |
| **Styling** | Tailwind CSS v4 |
| **Icons & Animation** | Lucide React, Motion (`motion/react`) |
| **Database & Auth** | Supabase (PostgreSQL 15+), Realtime, Storage, Row Level Security (RLS) |
| **SEO & Microdata** | Schema.org JSON-LD, Open Graph Protocol, Twitter Cards |

---

## 📁 Project Architecture

```
├── .env.example                # Environment variable documentation
├── index.html                  # HTML5 entry point with base SEO & Schema.org
├── metadata.json               # Application metadata and capabilities
├── package.json                # Project dependencies and build scripts
├── supabase-schema.sql         # Supabase PostgreSQL schema, RLS, and functions
├── src/
│   ├── main.tsx                # React DOM entry point
│   ├── App.tsx                 # Root router, state orchestration & SEO mounting
│   ├── index.css               # Global Tailwind CSS styling
│   ├── types/
│   │   └── index.ts            # TypeScript interfaces, types & enums
│   ├── context/
│   │   └── AuthContext.tsx     # Supabase Auth session & profile management
│   ├── lib/
│   │   ├── supabase.ts         # Supabase client initialization
│   │   └── db.ts               # Database service layer (queries & mutations)
│   ├── utils/
│   │   └── seo.ts              # SEO metadata builders & head tag mutators
│   └── components/
│       ├── common/
│       │   ├── SEOManager.tsx  # Dynamic SEO component & Schema.org manager
│       │   ├── PropertyCard.tsx
│       │   ├── Skeletons.tsx
│       │   ├── SupabaseConfigModal.tsx
│       │   └── SupabaseStatusBanner.tsx
│       ├── layout/
│       │   ├── Navbar.tsx      # Navigation, currency switcher & quick links
│       │   └── Footer.tsx      # Legal, contact & sitemap directory
│       ├── views/
│       │   ├── HomeView.tsx    # Hero search, curated listings, categories & guarantees
│       │   ├── SearchFilterView.tsx # Filter by room, land, property, price, and amenities
│       │   ├── PropertyDetailView.tsx # Detailed view, media gallery, units & booking
│       │   ├── CustomerPortalView.tsx # Client dashboard for reservations & receipts
│       │   ├── AdminDashboardView.tsx # Enterprise management & approval dashboard
│       │   ├── AgentPortalView.tsx    # Agent viewings & assigned listings
│       │   └── HowItWorksView.tsx     # Step-by-step buyer and renter guide
│       ├── modals/
│       │   ├── ReservationModal.tsx   # Lock unit, customer details & payment
│       │   ├── ViewingRequestModal.tsx# Inspection tour scheduling
│       │   └── ReceiptModal.tsx       # Official verified receipt viewer & printout
│       └── auth/
│           └── AuthModal.tsx          # Real Supabase user authentication
```

---

## ⚙️ Setup & Installation

### 1. Prerequisites
- Node.js (v18 or higher)
- npm or bun
- A free or paid [Supabase](https://supabase.com) project

### 2. Environment Configuration
Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

Set your Supabase project credentials in `.env`:

```env
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
```

### 3. Database Schema Setup
1. Log into your Supabase Dashboard.
2. Open the **SQL Editor**.
3. Copy the entire contents of `supabase-schema.sql` and run the script.
4. The script provisions:
   - Tables: `profiles`, `properties`, `property_units`, `property_media`, `reservations`, `payments`, `viewing_appointments`, `company_settings`, `audit_logs`.
   - Security: Complete Row Level Security (RLS) policies for Owner, Agent, and Customer roles.
   - Triggers: Automatic profile creation upon user sign-up.

### 4. Install Dependencies & Run
```bash
npm install
npm run dev
```

The application will start at `http://localhost:3000`.

---

## 🛡️ Production & Security Principles

- **No Mock or Sample Data**: The platform connects directly to live PostgreSQL and operates cleanly from an empty state without hardcoded dummy arrays.
- **Row Level Security (RLS)**: Sensitive business metrics, audit records, and customer payment details are protected at the database engine level.
- **Zero Client Secrets**: Service role keys and payment secrets are never exposed in client bundles.

---

## 📄 License & Ownership

Copyright © 2026 **ADIBEX PRESTIGE ENTERPRISE**. All rights reserved.  
*Your Vision Our Mission.*
