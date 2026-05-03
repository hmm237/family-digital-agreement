# Quick Deployment Checklist

## Pre-Deployment

- [ ] Supabase project created
- [ ] Database migration run successfully
- [ ] `.env.local` configured with Supabase keys
- [ ] `bun install` completed
- [ ] `bun dev` works locally
- [ ] Test account created and confirmed
- [ ] Family created successfully
- [ ] Extension installed and configured locally
- [ ] Visits appear in dashboard (real-time)

## Deploy to Vercel

1. **Push to GitHub**
   ```bash
   git init
   git add .
   git commit -m "Initial commit - Family Digital Agreement"
   git branch -M main
   git remote add origin https://github.com/YOUR_USERNAME/family-digital-agreement.git
   git push -u origin main
   ```

2. **Deploy on Vercel**
   - Go to https://vercel.com/new
   - Import GitHub repository
   - Project name: `family-digital-agreement`
   - Framework: Next.js
   - Build command: `bun run build` (or `bun build`)
   - Click **Deploy**

3. **Configure Environment Variables on Vercel**
   - In project dashboard: **Settings** → **Environment Variables**
   - Add:
     ```
     NEXT_PUBLIC_SUPABASE_URL = https://xxx.supabase.co
     NEXT_PUBLIC_SUPABASE_ANON_KEY = eyJxxx...
     SUPABASE_SERVICE_ROLE_KEY = eyJxxx...
     ```
   - Click **Save**
   - Redeploy: **Deployments** → **Redeploy** (three dots menu)

4. **Wait for deployment** (~2 minutes)
   - Test: `https://your-project.vercel.app`
   - Login with test account
   - Verify dashboard loads

## Post-Deployment

1. **Update Auth URLs in Supabase**
   - Supabase dashboard → **Authentication** → **Settings**
   - **Site URL**: `https://your-project.vercel.app`
   - **Redirect URLs**: `https://your-project.vercel.app/*`
   - Save

2. **Test Extension with Production URL**
   - In Chrome extension popup, update Web App URL
   - Toggle tracking ON
   - Visit any website
   - Check dashboard shows new visit within 30s

3. **Share with Family**
   - Have each family member:
     1. Sign up at your Vercel URL
     2. Install the Chrome extension
     3. Copy their User ID from **Settings** page
     4. Configure extension with app URL + their IDs
     4. Start tracking

## Optional: Custom Domain

1. Buy domain (Namecheap, Google Domains, etc.)
2. Vercel dashboard → **Settings** → **Domains** → **Add Domain**
3. Add DNS records as instructed (CNAME to `cname.vercel-dns.com`)
4. Wait for DNS propagation (~5 min)
5. Update Supabase Auth Site URL to custom domain
6. Extension config uses custom domain

## Monitoring & Maintenance

- **Supabase Dashboard**: Monitor database size, API usage, errors
- **Vercel Dashboard**: Check function invocations, bandwidth
- **Set up alerts**: Supabase → **Settings** → **Alerts** (optional)

## Cost Estimate (if you exceed free tier)

- **Supabase**: $25/month for 8GB DB, 500K MAUs
- **Vercel**: $20/month Pro (if you need more serverless funcs/memory)
- **Most families stay within free limits** indefinitely

## Troubleshooting

**Extension "Failed to fetch"**
- Ensure API URL starts with `https://` if deployed
- Check Vercel function logs: **Functions** tab in Vercel dashboard
- CORS already enabled in API route

**Visits not appearing**
- Verify `SUPABASE_SERVICE_ROLE_KEY` is set in Vercel env vars
- Check `visits` table in Supabase for rows
- Supabase RLS might block: check **RLS policies** are applied

**Auth redirect loops**
- Confirm Supabase **Site URL** matches your deployed domain exactly
- Clear browser cookies and try incognito

**Extension doesn't load**
- Chrome requires manifest V3; we use that
- Make sure you loaded the **unpacked extension** from the `extension/` folder
- Check `chrome://extensions/` for errors (click "Errors" under extension card)

**PDF export not working**
- jsPDF works client-side; ensure browser allows popups/downloads
- Try CSV export instead to isolate issue

## Files You Need to Know

- `extension/manifest.json` → extension config
- `extension/background.js` → tracking logic
- `src/app/api/visits/route.ts` → visit ingestion API
- `supabase/migrations/` → database schema
- `SETUP_DEPLOY.md` → detailed setup guide

All set! Your system is now live.
