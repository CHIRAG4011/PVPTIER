# PVPTIERS — Vercel Deployment Guide

This guide walks you through deploying the PVPTIERS platform to Vercel as a **single project** — the API (serverless function) and the React frontend are served together from one Vercel deployment.

---

## Prerequisites

- A [Vercel account](https://vercel.com) (free tier works)
- This repository pushed to GitHub / GitLab / Bitbucket
- Your MongoDB Atlas cluster already running

---

## Deploy — Single Vercel Project

### 1. Create a new Vercel project

1. Go to [vercel.com/new](https://vercel.com/new)
2. Import your repository
3. On the **Configure Project** screen, set:
   - **Root Directory**: `.` *(the repo root — leave as default)*
   - **Framework Preset**: Other
   - **Build Command**: *(leave empty — handled by `vercel.json`)*
   - **Output Directory**: *(leave empty — handled by `vercel.json`)*
   - **Install Command**: *(leave empty)*

> Vercel will automatically detect and use `vercel.json` at the project root.

### 2. Add environment variables

In the project settings → **Environment Variables**, add:

| Variable | Value |
|---|---|
| `MONGODB_URI` | `mongodb+srv://...` *(your Atlas connection string)* |
| `SESSION_SECRET` | *(any long random string, e.g. 64 random hex chars)* |

> **Tip**: Generate a session secret with: `node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"`

> **Note**: `VITE_API_URL` is **not needed** — both the API and frontend are on the same domain, so API calls use relative paths automatically.

### 3. Deploy

Click **Deploy**. Your full app will be live at a single URL:
```
https://pvptiers.vercel.app
```

- `/` → React frontend (static)
- `/api/*` → Express API (serverless function)

### 4. Seed the database

After the first deploy, seed the database to create the admin user and test players:

```bash
curl -X POST https://YOUR-APP-URL.vercel.app/api/admin/seed \
  -H "Content-Type: application/json" \
  -d '{"force": true}'
```

Admin credentials:
- **Email**: `admin@pvp.gg`
- **Password**: `Admin1234!`

---

## How It Works

The root `vercel.json` configures:

- **Build**: Runs `pnpm install` + builds the React frontend via Vite
- **Output**: Frontend static files from `artifacts/pvp-leaderboard/dist/public`
- **API function**: `artifacts/api-server/api/index.ts` (Express app as a serverless function)
- **Routing**:
  - `/api/*` → API serverless function
  - Everything else → Frontend `index.html` (SPA routing)

---

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `MONGODB_URI` | Yes | MongoDB Atlas connection string |
| `SESSION_SECRET` | Yes | Secret for JWT signing |

---

## Redeploying After Changes

Push to your main branch — Vercel will auto-redeploy if you have Git integration enabled.

---

## Troubleshooting

**"Cannot connect to MongoDB"** — Check that `MONGODB_URI` is set correctly and your Atlas cluster allows all IPs (`0.0.0.0/0`).

**API returns 404** — Make sure Vercel is deploying from the repo root (not a subdirectory).

**Login not working after redeployment** — JWT tokens from a previous deployment are invalid if `SESSION_SECRET` changed. Log in fresh.
