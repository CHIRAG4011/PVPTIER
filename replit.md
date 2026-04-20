# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: MongoDB Atlas + Mongoose
- **Validation**: Zod (`zod/v4`)
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)

## Project: PvP Leaderboard (pvptiers.it-inspired)

A full-stack Minecraft PvP ranking platform with:
- **Frontend** (`artifacts/pvp-leaderboard`): React + Vite + TailwindCSS, includes public leaderboard, player profiles (Minecraft skin via mc-heads.net), match submissions, support tickets, announcements, and a full admin panel.
- **API Server** (`artifacts/api-server`): Express 5 + Mongoose + MongoDB Atlas, JWT auth, role-based access control.
- **Admin Panel**: Routes under `/admin/*`, requires `admin`/`superadmin`/`moderator` role. Covers dashboard analytics, user management, player stat editing, submission review, ticket management, season control, announcements, audit logs, site settings, and role management.

### Admin Access
Default admin account: `admin@pvp.gg` / `Admin1234!` (role: superadmin)
To create additional admins, register normally then update role directly in DB.

### Features Added (Latest Session)
- **Site Settings** (`/admin/settings`): Full content editor with 6 sections: General (site name, description, server IP), Homepage (hero title, subtitle, season badge), Leaderboard, Discord, Social Links, Theme Colors. Settings stored in DB and served via `/api/settings/public`. Used dynamically in Navbar and Home page.
- **Custom Roles** (`/admin/roles`): CRUD role management with 78 granular permissions across 11 categories (users, players, matches, submissions, tickets, announcements, seasons, roles, settings, admin, moderation). Permission picker with group select-all.
- **Test Data Seeding**: Admin dashboard "Quick Tools" has seed buttons. POST `/api/admin/seed` seeds 20 fake players with gamemode stats and match history. Force re-seed option available.
- **User Profile Settings** (`/settings`): Change username, bio, avatar URL, and password. Accessible from user dropdown in navbar.
- **Forgot Password** (`/forgot-password`): Generates a reset token (displayed on screen, no email needed). Token expires in 1 hour.
- **Reset Password** (`/reset-password`): Token-based password reset. Token auto-filled from URL params when linked from forgot-password page.
- **Site Settings Context**: `SiteSettingsProvider` wraps the entire app. All components can call `useSiteSettings()` to access dynamic values.
- **78 Permissions**: Defined in `artifacts/api-server/src/lib/permissions.ts`. Keys follow pattern `category.action`.

### MongoDB Collections
- `users`, `players` (with embedded `gamemodeStats`), `matches`, `submissions`, `tickets`, `ticketreplies`, `announcements`, `seasons`, `adminlogs`, `sitesettings`, `customroles`, `usercustomroles`, `passwordresets`
- Models in `lib/db/src/models/`. All expose `id` (string ObjectId) in API responses.
- Connection string stored in `MONGODB_URI` env var (MongoDB Atlas cluster).

### Vercel Deployment
See `DEPLOYMENT.md` for full Vercel deployment guide. Deploy as a **single Vercel project** from the repo root:
- Root `vercel.json` routes `/api/*` to the Express serverless function and everything else to the React SPA.
- Only two env vars needed: `MONGODB_URI` and `SESSION_SECRET`. No `VITE_API_URL` required (same domain).

### Admin Auto-Init
The API server (`app.ts`) automatically creates the default `admin@pvp.gg` / `Admin1234!` superadmin account on startup if it doesn't exist in the DB. This means a fresh MongoDB connection will always have the admin account available immediately — no manual seeding required just to log in.

### Vercel Sync Notes
- After pushing code changes, Vercel redeploys automatically (both API function and frontend)
- `SESSION_SECRET` must be the same between deployments — changing it invalidates all existing JWT tokens (users must log in again)
- `MONGODB_URI` must point to the correct Atlas cluster and database
- The serverless `api/index.js` now properly awaits MongoDB connection before serving requests (fixes cold-start race condition)

### Known Issues Fixed
- Database schema was not pushed on first boot — fixed, now tables exist
- `GET /admin/users` was missing role filter — fixed
- `GET /submissions` was missing status filter — fixed
- `GET /tickets` was missing status filter — fixed
- `GET /admin/logs` was missing action filter — fixed
- `GET /leaderboard/top` crashed with empty DB — fixed
- Home page crashed on null players in byGamemode — fixed
- Admin account not auto-created on fresh DB — fixed, `app.ts` now creates it on startup
- Seed button showed error toast on "already seeded" response — fixed, now shows info toast
- Roles/settings pages showed success even on 403 errors — fixed, apiRequest now throws on non-OK status
- Vercel serverless handler had cold-start race condition with MongoDB — fixed with explicit connection await

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `POST /api/admin/seed` — seed MongoDB with 20 test players + admin account
- `pnpm --filter @workspace/api-server run dev` — run API server locally

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.
