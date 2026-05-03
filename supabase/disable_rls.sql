-- Disable RLS for testing - remove after confirming app works
-- Run this in Supabase SQL Editor if you get 403 errors

alter table if exists users disable row level security;
alter table if exists families disable row level security;
alter table if exists visits disable row level security;
alter table if exists rules disable row level security;
alter table if exists goals disable row level security;
