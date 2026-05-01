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

**Admin panel not working / roles and settings not saving after deploying**
This is almost always one of these three causes:
1. **Session token mismatch** — `SESSION_SECRET` in Vercel doesn't match what was used to sign your login token. Log out, log back in, then retry.
2. **Wrong database** — `MONGODB_URI` is pointing to a different MongoDB database than expected. Confirm the URI ends with `/pvptiers?...`.
3. **Stale deployment** — You pushed code but Vercel hasn't finished redeploying. Wait a minute and hard-refresh the browser (`Ctrl+Shift+R` or `Cmd+Shift+R`).

**Admin account missing on fresh database**
The admin account (`admin@pvp.gg` / `Admin1234!`) is now created automatically when the server starts against a fresh database. No manual curl command is needed. If it still doesn't exist, check that `MONGODB_URI` is set correctly and the server started without errors.

**Seed command returns "already seeded"**
This is not an error — it means your database already has player data. Use "Force Re-seed" on the admin dashboard if you want to reset the player data.

**Frontend shows blank page or can't reach API**
When using the single-project deployment (root `vercel.json`), no `VITE_API_URL` is needed — the API and frontend share the same domain. If you deployed as two separate projects, make sure `VITE_API_URL` is set in the frontend project and points to the API server URL (no trailing slash).

**Login not working after redeployment**
If `SESSION_SECRET` changed, old JWT tokens are invalid. Simply log in again.

**Build fails on Vercel**
Make sure all files were committed and pushed to GitHub. The build command in the root `vercel.json` builds both the API and frontend automatically.
