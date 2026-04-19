# PVPTIERS — Vercel Deployment Guide

This guide walks you through deploying the PVPTIERS platform to Vercel using **two separate projects**:

- **API Server** — Node.js serverless functions (Express) backed by MongoDB Atlas
- **Frontend** — Static React/Vite site

---

## Prerequisites

- A [Vercel account](https://vercel.com) (free tier works)
- This repository pushed to GitHub / GitLab / Bitbucket
- Your MongoDB Atlas cluster already running (you provided this)

---

## Part 1 — Deploy the API Server

### 1. Create a new Vercel project

1. Go to [vercel.com/new](https://vercel.com/new)
2. Import your repository
3. On the **Configure Project** screen, set:
   - **Root Directory**: `artifacts/api-server`
   - **Framework Preset**: Other
   - **Build Command**: *(leave empty — Vercel uses `vercel.json`)*
   - **Output Directory**: *(leave empty)*

### 2. Add environment variables

In the project settings → **Environment Variables**, add:

| Variable | Value |
|---|---|
| `MONGODB_URI` | `mongodb+srv://chiraggupta0223360:DUSKROOT@cluster0.hanc0l6.mongodb.net/pvptiers` |
| `SESSION_SECRET` | *(any long random string, e.g. 64 random hex chars)* |

> **Tip**: Generate a session secret with: `node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"`

### 3. Deploy

Click **Deploy**. Once complete, note your API URL — it will be something like:
```
https://pvptiers-api.vercel.app
```

### 4. Seed the database

After deployment, run the seed once to create the admin user and test players:

```bash
curl -X POST https://YOUR-API-URL.vercel.app/api/admin/seed \
  -H "Content-Type: application/json" \
  -d '{"force": true}'
```

Admin credentials will be:
- **Email**: `admin@pvp.gg`
- **Password**: `Admin1234!`

---

## Part 2 — Deploy the Frontend

### 1. Create another Vercel project

1. Go to [vercel.com/new](https://vercel.com/new) again
2. Import the **same repository**
3. On the **Configure Project** screen, set:
   - **Root Directory**: `artifacts/pvp-leaderboard`
   - **Framework Preset**: Vite
   - **Build Command**: `cd ../.. && pnpm install && pnpm --filter @workspace/pvp-leaderboard run build`
   - **Output Directory**: `dist/public`
   - **Install Command**: *(leave empty — handled by build command)*

### 2. Add environment variables

| Variable | Value |
|---|---|
| `VITE_API_URL` | `https://YOUR-API-URL.vercel.app` (from Part 1) |
| `BASE_PATH` | `/` |

### 3. Deploy

Click **Deploy**. Your frontend will be live at a URL like:
```
https://pvptiers.vercel.app
```

---

## Part 3 — Configure CORS (Important)

After both deployments, update the API server to allow requests from the frontend domain.

In your API server project on Vercel, add another environment variable:

| Variable | Value |
|---|---|
| `ALLOWED_ORIGIN` | `https://YOUR-FRONTEND-URL.vercel.app` |

Then update `artifacts/api-server/src/app.ts` to use this:

```typescript
app.use(cors({
  origin: process.env.ALLOWED_ORIGIN || "*",
  credentials: true,
}));
```

> For quick testing, the current setup uses `cors()` with no restrictions, which allows all origins.

---

## Summary of Environment Variables

### API Server (Vercel project 1)

| Variable | Required | Description |
|---|---|---|
| `MONGODB_URI` | Yes | MongoDB Atlas connection string |
| `SESSION_SECRET` | Yes | Secret for JWT signing |

### Frontend (Vercel project 2)

| Variable | Required | Description |
|---|---|---|
| `VITE_API_URL` | Yes | Full URL of your deployed API server |
| `BASE_PATH` | Yes | Set to `/` |

---

## Redeploying After Changes

Push to your main branch — Vercel will auto-redeploy both projects if you have Git integration enabled.

---

## Troubleshooting

**"Cannot connect to MongoDB"** — Check that `MONGODB_URI` is set correctly and your Atlas cluster has network access set to allow all IPs (`0.0.0.0/0`).

**CORS errors in browser** — Make sure `VITE_API_URL` points to the correct API URL (no trailing slash).

**Login not working after deployment** — JWT tokens from the old deployment are invalid (different `SESSION_SECRET`). Log in fresh.
