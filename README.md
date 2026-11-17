# Local Cargo & Bilty Pickup Platform

A monorepo for a local cargo/bilty pickup and delivery service where users upload their **Bilty (cargo receipt)** and **ID Card (CNIC)**, pre-pay any unpaid *To-Pay* freight charges, and a verified motorbike rider collects the parcel from the cargo terminal (*adda*) and delivers it with OTP verification.

## Workspace Structure

- `packages/shared` — Shared TypeScript types, status enums, and fare calculation logic
- `apps/api` — NestJS + Prisma + PostgreSQL backend API
- `apps/user-app` — React Native (Expo) mobile app for Customers
- `apps/rider-app` — React Native (Expo) mobile app for Riders (with secure watermarked Bilty/ID viewer)
- `apps/admin-web` — Next.js Admin dashboard for Rider KYC approvals & order monitoring

## Quick Start (Local Development)

1. Copy `.env.example` to `.env` in `apps/api/` and configure `DATABASE_URL`, `JWT_SECRET`, and storage keys.
2. Install dependencies from the root:
   ```bash
   npm install
   ```
3. Generate Prisma client and run migrations:
   ```bash
   npm run prisma:generate
   npm run prisma:migrate
   ```
4. Start the services:
   ```bash
   npm run dev:api
   npm run dev:admin
   npm run dev:user
   npm run dev:rider
   ```

## Environments
- **Local**: `http://localhost:3001` (API), `http://localhost:3000` (Admin Web)
- **Staging / Production**: TBD before deployment
