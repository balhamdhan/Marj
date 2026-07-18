# Marj

Real, database-backed operations & finance app. This first version includes:
- Email/password login and signup (Supabase Auth)
- A Finances page: add and list real revenue/expense transactions and invoices,
  with live KPI cards (revenue, expenses, net position) calculated from real data

Everything reads from and writes to your real Supabase project — no mock data.

## Deploying this (no local setup required)

### 1. Push this code to GitHub
- Create a free account at github.com if you don't have one
- Create a **new repository** (e.g., "marj-app"), keep it Private
- On the new repo's page, click **"uploading an existing file"**
- Drag every file and folder from this project into the upload box, then commit

### 2. Connect it to Vercel
- Create a free account at vercel.com (you can sign up with your GitHub account directly)
- Click **"Add New" → "Project"**
- Select your "marj-app" GitHub repo → **Import**

### 3. Add your environment variables in Vercel (NOT in a file)
Before clicking Deploy, expand **"Environment Variables"** and add:
- `NEXT_PUBLIC_SUPABASE_URL` → your Supabase Project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` → your Supabase anon/public key

(Both from Supabase → Project Settings → API — same values from Step 2 of the build guide.)

### 4. Deploy
Click **Deploy**. Vercel will install dependencies and build the app automatically —
this is the step that actually tests whether the code compiles, since it wasn't
possible to test-build in the environment this was written in.

## If the build fails

Open the failed deployment in Vercel and click **"View Build Logs"** — copy the
error text (usually near the bottom, in red) and bring it back for a fix.

## Testing after deploy

1. Visit your live Vercel URL
2. Sign up for a new account
3. Add a few transactions and an invoice
4. Refresh the page — everything should still be there (proof it's really
   saved in Supabase, not just showing temporarily)
5. Log out, log back in — same data should still appear

## What's NOT built yet (next steps)

- Operations page (inventory + shipments)
- Forecast page (targets + cash runway)
- Dashboard summary page pulling it all together

Bring this repo back once Finances is tested and working, and we'll build the
next module the same way.
