# PVPTIERS — Deployment Guide

This guide walks you through publishing PVPTIERS to the internet using **GitHub + Vercel** as a single unified project.

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

Vercel will automatically detect the push and redeploy your app.

---

## Part 2 — Deploy to Vercel

### 1. Create a Vercel account

Go to [vercel.com](https://vercel.com) and sign up (free). Sign in with your GitHub account for the easiest setup.

### 2. Import your GitHub repository

1. Go to [vercel.com/new](https://vercel.com/new)
2. Click **Continue with GitHub** and authorize Vercel
3. Find your repo (`pvptiers`) and click **Import**

### 3. Configure the project

On the **Configure Project** screen:

| Setting | Value |
|---|---|
| **Root Directory** | `.` *(leave as default — the repo root)* |
| **Framework Preset** | Other |
| **Build Command** | *(leave empty)* |
| **Output Directory** | *(leave empty)* |
| **Install Command** | *(leave empty)* |

> Vercel reads `vercel.json` at the root of the repo and handles everything automatically.

### 4. Add environment variables

Scroll down to **Environment Variables** and add:

| Variable | Value |
|---|---|
| `MONGODB_URI` | Your MongoDB Atlas connection string, e.g. `mongodb+srv://user:pass@cluster.mongodb.net/pvptiers` |
| `SESSION_SECRET` | A long random secret string (see tip below) |

**Tip — generate a session secret:**
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```
Copy the output and paste it as the value for `SESSION_SECRET`.

> `VITE_API_URL` is **not needed** — the API and frontend share the same domain, so all API calls use relative paths automatically.

### 5. Deploy

Click **Deploy**. Vercel will:
- Install all dependencies
- Build the React frontend
- Set up the Express API as a serverless function

Your app will go live at a URL like:
```
https://pvptiers.vercel.app
```

- `/` → React frontend
- `/api/*` → Express API

---

## Part 3 — Seed the Database (First Time Only)

After your first deploy, run this command to create the admin account and add test player data:

```bash
curl -X POST https://YOUR-APP-URL.vercel.app/api/admin/seed \
  -H "Content-Type: application/json" \
  -d '{"force": true}'
```

Replace `YOUR-APP-URL` with your actual Vercel URL.

Default admin login:
- **Email**: `admin@pvp.gg`
- **Password**: `Admin1234!`

---

## MongoDB Atlas Setup (if not done yet)

1. Go to [cloud.mongodb.com](https://cloud.mongodb.com) and create a free account
2. Create a **free M0 cluster**
3. Under **Database Access**, create a user with a username and password
4. Under **Network Access**, click **Add IP Address** → **Allow Access from Anywhere** (`0.0.0.0/0`)
5. Click **Connect** on your cluster → **Drivers** → copy the connection string
6. Replace `<password>` in the string with your DB user's password
7. Add `/pvptiers` before the `?` to target the correct database, e.g.:
   ```
   mongodb+srv://user:pass@cluster.mongodb.net/pvptiers?retryWrites=true&w=majority
   ```

---

## Redeploying After Changes

Just push to GitHub — Vercel redeploys automatically:

```bash
git add .
git commit -m "your change description"
git push
```

---

## Troubleshooting

**"Cannot connect to MongoDB"**
Check that `MONGODB_URI` is correct and that Network Access in Atlas allows `0.0.0.0/0`.

**API returns 404**
Make sure Vercel is deploying from the repo root (not a subdirectory like `artifacts/api-server`).

**Login not working after redeployment**
If `SESSION_SECRET` changed, old JWT tokens are invalid. Simply log in again.

**Build fails on Vercel**
Check that the repo has a `vercel.json` at the root and that all files were committed and pushed.
