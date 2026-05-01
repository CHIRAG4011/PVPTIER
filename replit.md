# PvP Leaderboard

## Overview

Minecraft PvP ranking platform. pnpm monorepo — React/Vite frontend (port 24684) + Express API (port 8080) + MongoDB (via MONGODB_URI secret, `teamsovergin` database).

## Stack

- **Frontend**: React + Vite, Tailwind CSS v4, Framer Motion, shadcn/ui components
- **Backend**: Express 5, Mongoose, MongoDB Atlas
- **Monorepo**: pnpm workspaces, TypeScript
- **Animation**: Framer Motion, custom CSS keyframes, tw-animate-css

## Key Files

- `artifacts/pvp-leaderboard/src/` — frontend source
  - `pages/` — home, leaderboard, tier-test, submit, admin/*
  - `components/effects/` — ParticlesBackground, CustomCursor, TypingText
  - `components/layout/` — Layout (includes particles+cursor), Navbar, AdminLayout
  - `lib/site-settings.tsx` — SiteSettingsProvider (theme + document.title)
  - `hooks/use-gamemodes.ts` — useGamemodes (public), useAllGamemodes (admin)
  - `index.css` — neon/glassmorphism animations + utilities
- `artifacts/api-server/src/routes/` — gamemodes, submissions, leaderboard, auth, settings

## Vercel Deployment

- `vercel.json` — configures build command, output directory, and API routing
- `api/index.ts` — Vercel serverless function entry point that wraps the Express app
- Frontend output: `artifacts/pvp-leaderboard/dist/public`
- API routes (`/api/*`) are rewritten to the serverless function
- Required Vercel environment variables: `MONGODB_URI`, `SESSION_SECRET`, `ADMIN_SETUP_EMAIL`, `ADMIN_SETUP_PASSWORD`

## Features

- Glassmorphism dark theme, neon cyan/purple/emerald color palette
- Animated canvas particle background with connecting lines
- Custom glow cursor with ring (desktop only)
- Framer Motion hero animations + scroll-reveal on all sections
- Typing animation cycling through phrases on the homepage
- Staggered AnimatePresence leaderboard entry animations
- Admin gamemodes CRUD page (`/admin/gamemodes`) with emoji picker
- Dynamic gamemodes sync: submit form, leaderboard filters, player stats all pull from DB
- Site name propagates to browser tab title via SiteSettingsProvider
