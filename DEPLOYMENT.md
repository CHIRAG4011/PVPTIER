# PvP Tiers — Deployment & Environment Setup

## Required Secrets

Set these in the Replit Secrets tab before running or deploying:

| Secret | Required | Description |
|--------|----------|-------------|
| `MONGODB_URI` | Yes | MongoDB connection string (e.g. `mongodb+srv://user:pass@cluster.mongodb.net/pvptiers`) |
| `SESSION_SECRET` | Yes | Random secret for JWT signing (min 32 chars, e.g. `openssl rand -hex 32`) |
| `SETUP_SECRET` | Optional | Required only if using `/api/setup-admin` to promote an account to superadmin |
| `ADMIN_SETUP_EMAIL` | Optional | Bootstrap: creates a superadmin with this email on server startup (one-time) |
| `ADMIN_SETUP_PASSWORD` | Optional | Bootstrap: password for the account above |
| `DISCORD_CLIENT_ID` | Optional | Enables Discord OAuth login |
| `DISCORD_CLIENT_SECRET` | Optional | Enables Discord OAuth login |
| `ALLOWED_ORIGINS` | Optional | Comma-separated allowed CORS origins for production (e.g. `https://yourdomain.com`) |

## First-Run Admin Bootstrap

Two options to create your first admin account:

### Option A — Env var bootstrap (recommended)
Set `ADMIN_SETUP_EMAIL` and `ADMIN_SETUP_PASSWORD` before the first server start.
The server creates the account once on startup, then the env vars are no longer needed.

### Option B — setup-admin endpoint
1. Register a regular account on the site
2. Set the `SETUP_SECRET` secret to a strong random value
3. Call: `POST /api/setup-admin` with `{ "email": "your@email.com", "setupKey": "<your SETUP_SECRET>" }`
4. Remove or rotate `SETUP_SECRET` after use

## Artifacts

| Artifact | URL | Description |
|----------|-----|-------------|
| Frontend | `/` | Vite + React app (PvP Tiers leaderboard) |
| API | `/api` | Express + MongoDB backend |

## Environment Variables (non-secret)

These are set automatically by the workflow config and do not need to be changed:

- `PORT` — assigned per artifact by Replit
- `NODE_ENV` — set to `production` during deployment builds
