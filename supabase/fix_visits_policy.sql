-- Run this in your Supabase SQL Editor:
-- https://supabase.com/dashboard/project/xvwitfpaqcdsjvcwookr/sql

-- The API uses the service role key which bypasses RLS by default.
-- However, if you've restricted service role access, this ensures inserts work.

-- Add a policy to allow the API (service role) to insert visits.
-- The service role bypasses RLS, so this is mainly for anon/authenticated roles.

-- Allow authenticated users to insert their own visits
create policy if not exists "visits_insert_own" on visits
  for insert
  with check (auth.uid() = user_id);

-- Also ensure the service role can do everything (should be default, but explicit)
-- NOTE: Service role key ALWAYS bypasses RLS. If inserts are failing,
-- the issue is the SUPABASE_SERVICE_ROLE_KEY env var not being set on Vercel.

-- Verify the visits table has the correct columns:
select column_name, data_type
from information_schema.columns
where table_name = 'visits'
order by ordinal_position;
