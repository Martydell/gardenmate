-- Care log table for GardenMate's plant detail feature (quick actions + history).
-- Run this once in your Supabase project's SQL editor (after plants_schema.sql).

create table if not exists public.care_log (
  id uuid primary key default gen_random_uuid(),
  plant_id uuid not null references public.plants (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  action_type text not null check (action_type in ('watered', 'fed', 'pruned', 'harvested')),
  notes text,
  photo_url text,
  logged_at timestamptz not null default now()
);

alter table public.care_log enable row level security;

create policy "Users can view their own care logs"
  on public.care_log for select
  using (auth.uid() = user_id);

create policy "Users can insert their own care logs"
  on public.care_log for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own care logs"
  on public.care_log for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete their own care logs"
  on public.care_log for delete
  using (auth.uid() = user_id);

create index if not exists care_log_plant_id_idx on public.care_log (plant_id);
create index if not exists care_log_user_id_idx on public.care_log (user_id);

-- If you already ran this file before 'harvested' was added, update the
-- constraint on an existing table with:
--   alter table public.care_log drop constraint care_log_action_type_check;
--   alter table public.care_log add constraint care_log_action_type_check
--     check (action_type in ('watered', 'fed', 'pruned', 'harvested'));
