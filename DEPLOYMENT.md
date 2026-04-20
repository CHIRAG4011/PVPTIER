# PVPTIERS — Deployment Guide

This guide walks you through deploying PVPTIERS to the internet using **GitHub + Vercel** as two separate projects — one for the API server and one for the frontend.

---

## Part 1 — Push Your Code to GitHub

You need a GitHub repository so Vercel can pull and build your code automatically.

### Option A — Create a new repo from scratch

1. Go to [github.com/new](https://github.com/new)
2. Give your repo a name (e.g. `pvptiers`)
3. Set it to **Private** or **Public** — your choice
4. **Do not** initialize with a README, .gitignore, or license
5. Click **Create repository**

GitHub will show you a page with commands. In your terminal, run:

```bash
git init
git add .
git commit -m "initial commit"
git branch -M main
git remote add origin https://github.com/YOUR-USERNAME/pvptiers.git
git push -u origin main
```

Replace `YOUR-USERNAME` and `pvptiers` with your actual GitHub username and repo name.

### Option B — Push to an existing repo

If you already have a GitHub repo set up:

```bash
git add .
git commit -m "update"
git push
```

### Pushing future changes

Every time you make changes and want to redeploy, just run:

```bash
git add .
git commit -m "describe your change"
git push
```

Vercel will automatically detect the push and redeploy both projects.

---

## Part 2 — Deploy the API Server

### 1. Create a Vercel account

Go to [vercel.com](https://vercel.com) and sign up (free). Sign in with your GitHub account for the easiest setup.

### 2. Import your GitHub repository

1. Go to [vercel.com/new](https://vercel.com/new)
2. Click **Continue with GitHub** and authorize Vercel
3. Find your repo and click **Import**

### 3. Configure the API project

On the **Configure Project** screen:

| Setting | Value |
|---|---|
| **Root Directory** | `artifacts/api-server` |
| **Framework Preset** | Other |
| **Build Command** | *(leave empty — vercel.json handles it)* |
| **Output Directory** | *(leave empty)* |
| **Install Command** | *(leave empty)* |

### 4. Add environment variables

Scroll down to **Environment Variables** and add:

| Variable | Value |
|---|---|
| `MONGODB_URI` | Your MongoDB Atlas connection string, e.g. `mongodb+srv://user:pass@cluster.mongodb.net/pvptiers?retryWrites=true&w=majority` |
| `SESSION_SECRET` | A long random secret string (see tip below) |

**Tip — generate a session secret:**
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```
Copy the output and paste it as the value for `SESSION_SECRET`.

### 5. Deploy

Click **Deploy**. Your API will go live at a URL like:
```
https://pvptiers-api.vercel.app
```

Note this URL — you will need it for the frontend project.

---

## Part 3 — Deploy the Frontend

### 1. Create a second Vercel project

1. Go to [vercel.com/new](https://vercel.com/new)
2. Import the **same GitHub repo** again

### 2. Configure the frontend project

On the **Configure Project** screen:

| Setting | Value |
|---|---|
| **Root Directory** | `artifacts/pvp-leaderboard` |
| **Framework Preset** | Other |
| **Build Command** | *(leave empty — vercel.json handles it)* |
| **Output Directory** | `dist` |
| **Install Command** | *(leave empty)* |

### 3. Add environment variables

| Variable | Value |
|---|---|
| `VITE_API_URL` | Your API server URL from Part 2, e.g. `https://pvptiers-api.vercel.app` |

> No trailing slash on the URL.

### 4. Deploy

Click **Deploy**. Your frontend will go live at a URL like:
```
https://pvptiers.vercel.app
```

---

## Part 4 — Seed the Database (First Time Only)

After both projects are deployed, run this to create the admin account and add test player data:

```bash
curl -X POST https://YOUR-API-URL.vercel.app/api/admin/seed \
  -H "Content-Type: application/json" \
  -d '{"force": true}'
```

Replace `YOUR-API-URL` with your actual API server Vercel URL.

Expected response:
```json
{"success": true, "message": "Seeded 20 players and match history"}
```

Default admin login:
- **Email**: `admin@pvp.gg`
- **Password**: `Admin1234!`

---

## MongoDB Atlas Setup (if not done yet)

1. Go to [cloud.mongodb.com](https://cloud.mongodb.com) and create a free account
2. Create a **free M0 cluster**
3. Under **Database Access**, create a user with a username and password
4. Under **Network Access**, click **Add IP Address** → **Allow Access from Anywhere** (`0.0.0.0/0`)
   > This is required — Vercel uses dynamic IPs so you must allow all addresses.
5. Click **Connect** on your cluster → **Drivers** → copy the connection string
6. Replace `<password>` in the string with your DB user's password
7. Add `/pvptiers` before the `?` to target the correct database:
   ```
   mongodb+srv://user:pass@cluster.mongodb.net/pvptiers?retryWrites=true&w=majority
   ```

---

## Redeploying After Changes

Just push to GitHub — Vercel redeploys both projects automatically:

```bash
git add .
git commit -m "your change description"
git push
```

---

## Troubleshooting

**"This Serverless Function has crashed" on the API**
Check the Vercel function logs (Deployment → Functions tab). The API will return a JSON error message explaining what went wrong. Common causes:
- `MONGODB_URI` is missing or wrong — double-check it in Vercel → Settings → Environment Variables
- MongoDB Atlas Network Access does not allow `0.0.0.0/0` — add it under Network Access in Atlas

**Seed command returns a crash**
Wait for Vercel to finish redeploying after a push, then try again. The seed runs many database operations and needs the 30-second timeout that is already configured.

**Frontend shows blank page or can't reach API**
Make sure `VITE_API_URL` is set correctly in the frontend Vercel project and points to the API server URL (no trailing slash).

**Login not working after redeployment**
If `SESSION_SECRET` changed, old JWT tokens are invalid. Simply log in again.

**Build fails on Vercel**
Make sure the Root Directory is set correctly (`artifacts/api-server` for the API, `artifacts/pvp-leaderboard` for the frontend) and all files were committed and pushed.
