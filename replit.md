# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)

## Project: PvP Leaderboard (pvptiers.it-inspired)

A full-stack Minecraft PvP ranking platform with:
- **Frontend** (`artifacts/pvp-leaderboard`): React + Vite + TailwindCSS, includes public leaderboard, player profiles (Minecraft skin via mc-heads.net), match submissions, support tickets, announcements, and a full admin panel.
- **API Server** (`artifacts/api-server`): Express 5 + Drizzle ORM + PostgreSQL, JWT auth, Discord OAuth2 placeholder, role-based access control.
- **Admin Panel**: Routes under `/admin/*`, requires `admin`/`superadmin`/`moderator` role. Covers dashboard analytics, user management, player stat editing, submission review, ticket management, season control, announcements, and audit logs.

### Admin Access
Default admin account: `admin@pvp.gg` / `admin123456` (role: superadmin)
To create additional admins, register normally then update role directly in DB.

### Known Issues Fixed
- Database schema was not pushed on first boot — fixed, now tables exist
- `GET /admin/users` was missing role filter — fixed
- `GET /submissions` was missing status filter — fixed
- `GET /tickets` was missing status filter — fixed
- `GET /admin/logs` was missing action filter — fixed
- `GET /leaderboard/top` crashed with empty DB — fixed
- Home page crashed on null players in byGamemode — fixed

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.
