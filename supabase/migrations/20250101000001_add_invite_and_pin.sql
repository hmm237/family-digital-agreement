-- Add invite_code to families
alter table families add column if not exists invite_code text unique;
alter table families add column if not exists force_tracking boolean default false;

-- Add pin to users and make email nullable
alter table users add column if not exists pin text;
alter table users alter column email drop not null;

-- Function to generate a random 6-character invite code
create or replace function generate_invite_code()
returns text as $$
declare
  chars text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  result text := '';
  i integer := 0;
begin
  for i in 1..6 loop
    result := result || substr(chars, floor(random() * length(chars) + 1)::integer, 1);
  end loop;
  return result;
end;
$$ language plpgsql;

-- Trigger to auto-generate invite code for new families
create or replace function handle_new_family()
returns trigger as $$
begin
  if NEW.invite_code is null then
    NEW.invite_code := generate_invite_code();
  end if;
  return NEW;
end;
$$ language plpgsql;

create trigger on_family_created
  before insert on families
  for each row execute procedure handle_new_family();

-- Update existing families with invite codes
update families set invite_code = generate_invite_code() where invite_code is null;

-- RLS Policies for new features
-- Allow parents to add new members to their family
create policy "Parents can add members"
  on users for insert
  with check (
    exists (
      select 1 from users p
      where p.id = auth.uid()
      and p.family_id = NEW.family_id
      and p.role = 'parent'
    )
  );

-- Allow anyone to lookup family via invite code (for joining)
create policy "Anyone can lookup family via invite code"
  on families for select
  using (true);

-- Allow users to see their family members
create policy "Users can see their family members"
  on users for select
  using (
    family_id in (
      select family_id from users where id = auth.uid()
    )
  );
