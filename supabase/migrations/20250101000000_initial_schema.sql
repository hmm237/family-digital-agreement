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

-- Create users table (extends auth.users)
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

-- Create indexes for performance
create index idx_visits_user_id on visits(user_id);
create index idx_visits_family_id on visits(family_id);
create index idx_visits_visited_at on visits(visited_at desc);
create index idx_visits_domain_category on visits(domain, category);
create index idx_rules_family_id on rules(family_id);
create index idx_goals_family_id on goals(family_id);
create index idx_goals_user_id on goals(user_id);
create index idx_goals_status on goals(status);

-- Enable Row Level Security
alter table users enable row level security;
alter table families enable row level security;
alter table visits enable row level security;
alter table rules enable row level security;
alter table goals enable row level security;

-- RLS Policies

-- Users: Users can read their own family's members
create policy "family_members_can_read_users" on users
  for select using (
  auth.uid() = id or
  family_id in (
    select family_id from users where id = auth.uid()
  )
);

-- Users can update their own profile
create policy "users_can_update_self" on users
  for update using (auth.uid() = id);

-- Parents can insert children into their family
create policy "parents_can_insert_children" on users
  for insert with check (
  auth.uid() in (
    select id from users where family_id = new.family_id and role = 'parent'
  )
);

-- Families: Family members can read their own family
create policy "family_members_can_read_family" on families
  for select using (
  id in (select family_id from users where id = auth.uid())
);

-- Only family creator (parent) can update/delete family
create policy "only_creator_can_modify_family" on families
  for all using (
  created_by = auth.uid() and
  auth.uid() in (select id from users where family_id = id and role = 'parent')
);

-- Visits: Family members can read visits from their family
create policy "family_members_can_read_visits" on visits
  for select using (
  family_id in (select family_id from users where id = auth.uid())
);

-- Extension can insert visits (via service role or API)
-- We'll use a secure API route with service role key for inserts

-- Rules: Family members can read rules from their family
create policy "family_members_can_read_rules" on rules
  for select using (
  family_id in (select family_id from users where id = auth.uid())
);

-- Only parents can insert/update/delete rules
create policy "parents_can_manage_rules" on rules
  for all using (
  family_id in (
    select family_id from users where id = auth.uid() and role = 'parent'
  )
);

-- Goals: Family members can read goals from their family
create policy "family_members_can_read_goals" on goals
  for select using (
  family_id in (select family_id from users where id = auth.uid())
);

-- Parents can manage goals
create policy "parents_can_manage_goals" on goals
  for all using (
  family_id in (
    select family_id from users where id = auth.uid() and role = 'parent'
  )
);

-- Children can update their own goal progress
create policy "children_can_update_own_goals" on goals
  for update using (
  user_id = auth.uid() and
  auth.uid() in (select id from users where family_id = goals.family_id)
);

-- Functions for handling new user signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.users (id, email, name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'name', 'Unknown'),
    coalesce(new.raw_user_meta_data->>'role', 'child')
  );
  return new;
end;
$$;

-- Trigger to automatically create user profile
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
