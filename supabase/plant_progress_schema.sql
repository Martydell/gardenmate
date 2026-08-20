-- Plant progress tracking: growth stages, milestone dates, and progress
-- photos. Run this once in your Supabase project's SQL editor (after
-- plants_schema.sql). Photos reuse the existing 'plant-photos' storage
-- bucket/policies from plants_schema.sql — no new bucket needed.

create table if not exists public.plant_stages (
  id uuid primary key default gen_random_uuid(),
  plant_id uuid not null references public.plants (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  stage text not null check (
    stage in ('seed', 'germination', 'seedling', 'juvenile', 'mature', 'flowering', 'fruiting_harvesting')
  ),
  note text,
  photo_url text,
  recorded_at timestamptz not null default now()
);

alter table public.plant_stages enable row level security;

create policy "Users can view their own plant stages"
  on public.plant_stages for select
  using (auth.uid() = user_id);

create policy "Users can insert their own plant stages"
  on public.plant_stages for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own plant stages"
  on public.plant_stages for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete their own plant stages"
  on public.plant_stages for delete
  using (auth.uid() = user_id);

create index if not exists plant_stages_plant_id_idx on public.plant_stages (plant_id);

create table if not exists public.plant_milestones (
  id uuid primary key default gen_random_uuid(),
  plant_id uuid not null references public.plants (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  milestone_type text not null check (
    milestone_type in ('first_sprout', 'first_true_leaves', 'first_flower', 'first_harvest', 'date_repotted')
  ),
  occurred_on date not null,
  note text,
  photo_url text,
  created_at timestamptz not null default now()
);

alter table public.plant_milestones enable row level security;

create policy "Users can view their own plant milestones"
  on public.plant_milestones for select
  using (auth.uid() = user_id);

create policy "Users can insert their own plant milestones"
  on public.plant_milestones for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own plant milestones"
  on public.plant_milestones for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete their own plant milestones"
  on public.plant_milestones for delete
  using (auth.uid() = user_id);

create index if not exists plant_milestones_plant_id_idx on public.plant_milestones (plant_id);

create table if not exists public.plant_progress_photos (
  id uuid primary key default gen_random_uuid(),
  plant_id uuid not null references public.plants (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  photo_url text not null,
  note text,
  taken_on date not null,
  created_at timestamptz not null default now()
);

alter table public.plant_progress_photos enable row level security;

create policy "Users can view their own progress photos"
  on public.plant_progress_photos for select
  using (auth.uid() = user_id);

create policy "Users can insert their own progress photos"
  on public.plant_progress_photos for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own progress photos"
  on public.plant_progress_photos for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete their own progress photos"
  on public.plant_progress_photos for delete
  using (auth.uid() = user_id);

create index if not exists plant_progress_photos_plant_id_idx on public.plant_progress_photos (plant_id);
