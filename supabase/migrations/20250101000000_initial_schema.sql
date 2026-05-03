-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Create families table
create table if not exists families (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  created_by uuid references auth.users not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create users table
create table if not exists users (
  id uuid primary key references auth.users on delete cascade,
  email text unique not null,
  name text not null,
  role text check (role in ('parent', 'child')) not null,
  family_id uuid references families(id) on delete set null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create visits table
create table if not exists visits (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references users(id) on delete cascade not null,
  family_id uuid references families(id) on delete cascade not null,
  url text not null,
  domain text not null,
  title text,
  duration_ms bigint not null,
  visited_at timestamp with time zone not null,
  category text check (category in (
    'social', 'gaming', 'video', 'education', 'search', 'news',
    'shopping', 'entertainment', 'productivity', 'communication', 'uncategorized'
  )) default 'uncategorized',
  was_blocked boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create rules table
create table if not exists rules (
  id uuid primary key default uuid_generate_v4(),
  family_id uuid references families(id) on delete cascade not null,
  name text not null,
  type text check (type in ('url_pattern', 'category', 'schedule')) not null,
  pattern text not null,
  action text check (action in ('block', 'allow', 'limit')) not null,
  limit_duration_minutes integer,
  schedule_start text,
  schedule_end text,
  schedule_days integer[],
  is_active boolean default true,
  created_by uuid references users(id) not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create goals table
create table if not exists goals (
  id uuid primary key default uuid_generate_v4(),
  family_id uuid references families(id) on delete cascade not null,
  user_id uuid references users(id) on delete cascade,
  title text not null,
  description text,
  type text check (type in ('daily_screen_time', 'category_limit', 'site_limit', 'bedtime')) not null,
  target_value numeric not null,
  current_value numeric default 0,
  unit text not null,
  period text check (period in ('daily', 'weekly')) not null,
  status text check (status in ('active', 'completed', 'missed')) default 'active',
  period_start date not null,
  period_end date not null,
  reward text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create indexes
create index idx_visits_user_id on visits(user_id);
create index idx_visits_family_id on visits(family_id);
create index idx_visits_visited_at on visits(visited_at desc);
create index idx_visits_domain_category on visits(domain, category);
create index idx_rules_family_id on rules(family_id);
create index idx_goals_family_id on goals(family_id);
create index idx_goals_user_id on goals(user_id);
create index idx_goals_status on goals(status);

-- Enable RLS
alter table users enable row level security;
alter table families enable row level security;
alter table visits enable row level security;
alter table rules enable row level security;
alter table goals enable row level security;

-- ============================================
-- HELPER FUNCTIONS (bypass RLS)
-- ============================================

create or replace function public.get_user_family_id(user_id uuid)
returns uuid
language sql
security definer
stable
as $$
  select family_id from public.users where id = $1;
$$;

create or replace function public.get_user_role(user_id uuid)
returns text
language sql
security definer
stable
as $$
  select role from public.users where id = $1;
$$;

-- ============================================
-- RLS POLICIES
-- ============================================

-- Users: Read own profile (always allowed)
create policy "users_read_own" on users for select using (auth.uid() = id);

-- Users: Read family members (via helper function to avoid recursion)
create policy "users_read_family" on users for select using (
  public.get_user_family_id(auth.uid()) = family_id
);

-- Users: Update own profile only
create policy "users_update_own" on users for update using (auth.uid() = id);

-- Parents: Can insert children into their family
create policy "parents_insert_children" on users for insert with check (
  public.get_user_role(auth.uid()) = 'parent' and
  public.get_user_family_id(auth.uid()) = users.family_id
);

-- Families: Members can read their family
create policy "families_read" on families for select using (
  id = public.get_user_family_id(auth.uid())
);

-- Only creator (who must be a parent) can modify family
create policy "families_modify" on families for all using (
  created_by = auth.uid() and
  public.get_user_role(auth.uid()) = 'parent'
);

-- Visits: Family members can read
create policy "visits_read" on visits for select using (
  family_id = public.get_user_family_id(auth.uid())
);

-- Rules: Family members can read
create policy "rules_read" on rules for select using (
  family_id = public.get_user_family_id(auth.uid())
);

-- Only parents can manage rules
create policy "rules_manage" on rules for all using (
  family_id = public.get_user_family_id(auth.uid()) and
  public.get_user_role(auth.uid()) = 'parent'
);

-- Goals: Family members can read
create policy "goals_read" on goals for select using (
  family_id = public.get_user_family_id(auth.uid())
);

-- Only parents can manage goals
create policy "goals_manage" on goals for all using (
  family_id = public.get_user_family_id(auth.uid()) and
  public.get_user_role(auth.uid()) = 'parent'
);

-- Children can update own goal progress
create policy "goals_update_own" on goals for update using (
  user_id = auth.uid()
);

-- ============================================
-- TRIGGER
-- ============================================

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.users (id, email, name, role)
  values (
    NEW.id,
    NEW.email,
    coalesce(NEW.raw_user_meta_data->>'name', 'Unknown'),
    coalesce(NEW.raw_user_meta_data->>'role', 'child')
  );
  return NEW;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
