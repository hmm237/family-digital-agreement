# Supabase Setup & Deployment Guide

## Step 1: Create Supabase Project

1. Go to [supabase.com](https://supabase.com) and sign in (or create account)
2. Click **New Project**
3. Enter project details:
   - **Name**: `family-digital-agreement` (or your preferred name)
   - **Database Password**: Choose a strong password (save this!)
   - **Region**: Choose closest to your users
4. Wait for project to initialize (~2 minutes)

## Step 2: Get Credentials

Once project is ready, go to **Settings** (gear icon) → **API**:

You'll need:

```
Project Settings → API:
- Project URL: https://xxx.supabase.co
- anon/public key: eyxxx... (starts with eyJ)
- service_role key: eyxxx... (starts with eyJ, longer)
```

**Important**: The `service_role` key has admin privileges. Never expose it client-side.

## Step 3: Run Database Migration

**Option A: Via Supabase Dashboard (easiest)**

1. In Supabase dashboard, go to **SQL Editor**
2. Click **New Query**
3. Copy contents of `supabase/migrations/20250101000000_initial_schema.sql`
4. Paste into editor
5. Name query: "Initial schema - Family Digital Agreement"
6. Click **Run** (may take 30 seconds)
7. Verify tables exist: Go to **Table Editor** → you should see `users`, `families`, `visits`, `rules`, `goals`

**Option B: Via Supabase CLI** (if you have it installed)

```bash
# Install CLI
npm install -g supabase

# Login
supabase login

# Link project
supabase link --project-ref YOUR_PROJECT_ID

# Push migration
supabase db push
```

## Step 4: Configure Authentication

1. In Supabase dashboard, go to **Authentication** → **Settings**
2. Under **Provider Configuration**, ensure **Email** is enabled
3. (Optional) Disable other providers if not needed
4. Under **Site Settings** → **URL Configuration**, add your site URL:
   - Local: `http://localhost:3000`
   - Production: `https://your-app.vercel.app`

## Step 5: Environment Variables

Create `.env.local` in project root:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJxxx... (anon key from Settings → API)
SUPABASE_SERVICE_ROLE_KEY=eyJxxx... (service_role key from Settings → API)
```

**⚠️ NEVER commit `.env.local` to git.** It's already in `.gitignore`.

## Step 6: Test Locally

```bash
# Install dependencies
bun install

# Start dev server
bun dev
```

Visit `http://localhost:3000`:

1. Click **Sign up**
2. Create account (check email for confirmation — in dev mode, check Supabase logs: **Authentication** → **Users** → click user → **Confirm user**)
3. After confirmation, you'll be redirected to **Family Setup**
4. Enter family name, click **Create Family**
5. You should see the dashboard

**To confirm email in dev:**
- In Supabase dashboard: **Authentication** → **Users**
- Find your new user, click **Edit**
- Toggle **Email confirmed** to ON
- Click **Save**

## Step 7: Deploy to Vercel (Recommended)

Vercel is free for personal projects and integrates seamlessly with Next.js.

### Option A: One-click Deploy

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/your-username/your-repo&project-name=family-digital-agreement&repository-name=family-digital-agreement)

### Option B: Manual Deploy

1. Push code to GitHub
2. Go to [vercel.com](https://vercel.com), sign in with GitHub
3. Click **New Project**
4. Import your repository
5. Configure:
   - **Framework Preset**: Next.js
   - **Root Directory**: `.` (root)
   - **Build Command**: `bun run build` (or `bun build`)
   - **Output Directory**: `.next`
6. **Environment Variables** (add all):
   ```
   NEXT_PUBLIC_SUPABASE_URL=your-project-url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
   ```
7. Click **Deploy**

Wait ~2 minutes, then your app is live at `https://your-project.vercel.app`.

## Step 8: Update Extension with Production URL

1. Open Chrome extension popup
2. Update **Web App URL** to your deployed URL (e.g., `https://your-project.vercel.app`)
3. Keep same User ID and Family ID (they're stored in Supabase, same across environments)
4. Toggle tracking ON

## Step 9: Verify Data Flow

1. With extension enabled, visit any website (e.g., google.com)
2. Wait 30 seconds (extension sends data)
3. In your web app dashboard, go to **History** tab
4. You should see the visit appear (real-time via subscription)

If not appearing:
- Check browser console (F12) in extension popup for errors
- Check web app network tab: visit `your-app.com/api/visits` should return 200
- Check Supabase **Table Editor** → `visits` table has rows

## Step 10: (Optional) Custom Domain on Vercel

1. In Vercel dashboard, go to your project → **Settings** → **Domains**
2. Add domain (e.g., `family.example.com`)
3. Follow DNS instructions (add CNAME record)
4. Update **Site URL** in Supabase **Authentication** settings to use custom domain

## Troubleshooting

**"Failed to fetch" in extension:**
- Ensure CORS is enabled (already in API code)
- If using localhost, extension can reach it fine
- If using HTTPS, ensure valid certificate

**"Missing required fields" error:**
- Extension config must have user_id, family_id, apiUrl all filled
- IDs are UUIDs from Supabase `users` table

**No real-time updates:**
- Ensure Supabase `realtime` is enabled (it's on by default)
- Check `visits` table has `id` primary key (it does in our schema)

**Authentication not persisting:**
- Ensure `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are correct
- Clear site data and re-login

## Cost

- **Supabase Free Tier**: 500MB database, 10K monthly active users, 2GB file storage → plenty for a family/community
- **Vercel Free Tier**: Unlimited projects, 100GB bandwidth/month, serverless functions — sufficient for small-to-medium usage

No ongoing costs unless you exceed free tier limits (~1000 daily active users).

## Next Steps After Deployment

1. **Create a Settings page** in the web app to display User ID and Family ID (so users don't need to dig in Supabase)
2. **Invite flow**: Generate invite codes for family members (currently manual ID sharing)
3. **Mobile app**: Consider React Native wrapper for Android/iOS if you need mobile monitoring (with limitations)
4. **Backups**: Enable daily backups in Supabase **Settings** → **Backups**
5. **Custom email**: In Supabase **Authentication** → **Templates**, customize email templates

## File Reference

- Database schema: `supabase/migrations/20250101000000_initial_schema.sql`
- API endpoint: `src/app/api/visits/route.ts`
- Auth context: `src/components/AuthProvider.tsx`
- Extension: `extension/` directory

Need help with a specific error? Share the error message and I'll troubleshoot.
