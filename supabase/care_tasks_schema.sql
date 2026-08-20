-- Care tasks table for GardenMate's care planning feature.
-- Run this once in your Supabase project's SQL editor (after plants_schema.sql).

create table if not exists public.care_tasks (
  id uuid primary key default gen_random_uuid(),
  plant_id uuid not null references public.plants (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  task_type text not null check (task_type in ('water', 'feed', 'prune', 'harvest')),
  due_date date not null,
  completed boolean not null default false,
  snoozed_until date,
  repeat_interval_days integer,
  notes text,
  created_at timestamptz not null default now()
);

alter table public.care_tasks enable row level security;

create policy "Users can view their own care tasks"
  on public.care_tasks for select
  using (auth.uid() = user_id);

create policy "Users can insert their own care tasks"
  on public.care_tasks for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own care tasks"
  on public.care_tasks for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete their own care tasks"
  on public.care_tasks for delete
  using (auth.uid() = user_id);

create index if not exists care_tasks_user_id_idx on public.care_tasks (user_id);
create index if not exists care_tasks_plant_id_idx on public.care_tasks (plant_id);
create index if not exists care_tasks_due_date_idx on public.care_tasks (due_date);
