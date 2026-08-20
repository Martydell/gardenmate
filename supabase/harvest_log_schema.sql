-- Harvest Log & Food Tracking (Improvement 8)

create table if not exists public.harvest_log (
  id uuid primary key default gen_random_uuid(),
  plant_id uuid not null references public.plants(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  quantity numeric not null check (quantity > 0),
  unit text not null check (unit in ('g', 'kg', 'items', 'bunches')),
  photo_url text,
  notes text,
  harvested_at timestamptz not null default now()
);

alter table public.harvest_log enable row level security;

create policy "Users can view their own harvest log"
  on public.harvest_log for select
  using (auth.uid() = user_id);

create policy "Users can insert their own harvest log"
  on public.harvest_log for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own harvest log"
  on public.harvest_log for update
  using (auth.uid() = user_id);

create policy "Users can delete their own harvest log"
  on public.harvest_log for delete
  using (auth.uid() = user_id);

create index if not exists harvest_log_plant_id_idx on public.harvest_log (plant_id);
create index if not exists harvest_log_user_id_harvested_at_idx on public.harvest_log (user_id, harvested_at);
