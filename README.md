# Family Digital Agreement

A transparent, consent-based parental monitoring web application with Chrome extension. Built with Next.js, Supabase, and Manifest V3.

## Features

- **Website Tracking**: Real-time logging of URLs visited, duration, and category classification
- **Dashboard**: View browsing history in table format with search/filters, pagination
- **Analytics**: Charts by category, daily usage, top domains, hourly heatmap
- **Rules Management**: Parents can create URL pattern, category, or schedule-based rules (block/allow/limit)
- **Goals & Rewards**: Set screen time goals with progress tracking and reward system
- **Export**: Download history as CSV or PDF
- **Chrome Extension**: Tracks visits and respects rules; installs with user knowledge

## Tech Stack

- **Frontend**: Next.js 16 (App Router), React 19, Tailwind CSS
- **Backend**: Supabase (Auth, Postgres, REST via API routes)
- **Charts**: Recharts
- **Export**: jsPDF, PapaParse
- **Icons**: Lucide React
- **Package Manager**: Bun

## Setup Instructions

### 1. Supabase Project

1. Create a free Supabase account at [supabase.com](https://supabase.com)
2. Create a new project
3. Note your **Project URL** and **anon/public key**

### 2. Database Migration

1. Copy the SQL from `supabase/migrations/20250101000000_initial_schema.sql`
2. In Supabase dashboard, go to **SQL Editor**
3. Paste and run the query. This creates tables, indexes, and RLS policies.

Alternatively, if using Supabase CLI locally:
```bash
supabase db push
```

### 3. Environment Variables

Rename `.env.example` to `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

Get the service role key from **Settings > API** in Supabase (caution: this key has admin privileges; keep it secret).

### 4. Install Dependencies & Run

```bash
bun install
bun dev
```

App will be at `http://localhost:3000`

### 5. Create Admin Account

1. Go to the app, click **Sign up**
2. Select **Parent** role
3. Create account
4. After confirming email (check console if in dev), you'll be redirected to **Family Setup**
5. Enter a family name (e.g., "Smith Family")
6. You'll be taken to the dashboard

### 6. Install Chrome Extension

1. Open Chrome, go to `chrome://extensions/`
2. Enable **Developer mode** (top right)
3. Click **Load unpacked**
4. Select the `extension/` folder in this project
5. The extension icon appears in toolbar

#### Configure Extension

1. Click the extension icon
2. Enter your **Web App URL** (e.g., `http://localhost:3000` or deployed URL)
3. Copy your **User ID** and **Family ID** from **Dashboard > Settings** (we'll add a Settings page soon; for now you can get IDs from Supabase `users` and `families` tables)
4. Paste into extension popup
5. Toggle **Enable tracking** ON

Now browsing activity will appear in the dashboard within seconds.

## Project Structure

```
├── src/
│   ├── app/
│   │   ├── api/visits/route.ts    # Extension visit submission endpoint
│   │   ├── login/page.tsx
│   │   ├── signup/page.tsx
│   │   ├── check-email/page.tsx
│   │   ├── family/setup/page.tsx  # Create or join family
│   │   ├── dashboard/page.tsx     # Main dashboard UI
│   │   └── layout.tsx
│   ├── components/
│   │   ├── AuthProvider.tsx        # Auth context + family data
│   │   ├── HistoryTable.tsx       # Visit list with filters
│   │   ├── AnalyticsCharts.tsx    # Recharts visualizations
│   │   ├── RulesManager.tsx       # CRUD for rules
│   │   ├── GoalsTracker.tsx       # Goals UI
│   │   └── ExportMenu.tsx         # CSV/PDF download
│   ├── lib/
│   │   ├── supabase.ts            # Supabase client
│   │   └── database.types.ts      # Manual DB types
│   └── types/index.ts             # TypeScript interfaces
├── extension/
│   ├── manifest.json              # MV3 manifest
│   ├── background.js              # Service worker
│   ├── popup.html/js              # Config UI
│   └── icons/                     # Extension icons
└── supabase/
    └── migrations/                # SQL schema
```

## Important Notes

### Transparency & Policy

This app is designed to be **transparent**:
- The child installs the extension themselves (or with parent's help)
- Both parent and child can view all logged data in the dashboard
- No stealth/hidden monitoring
- Complies with Chrome Web Store policies (requires conspicuous disclosure and consent)

### Data Model

- **users**: Extended from Supabase auth, includes role & family_id
- **families**: Family groups, created by a parent
- **visits**: Every page visit logged (url, domain, title, duration, category, timestamp, was_blocked)
- **rules**: Filtering rules (url pattern, category, schedule) with actions (block/allow/limit)
- **goals**: Screen time or category limits with target values and rewards

### Categorization

URLs are auto-categorized using domain heuristics. Parents can refine by creating rules that override categorization.

### Future Enhancements

- Real-time dashboard updates via Supabase subscriptions
- Settings page to view/edit user profile
- Mobile app (React Native) for on-the-go monitoring
- Family chat / agreement signing
- Notifications for rule violations
- More granular reporting

## License

MIT (or choose your preferred open source license)

## Support

For issues or feature requests, open an issue on GitHub.
