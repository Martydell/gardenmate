-- Complete GardenMate database setup: every table, column, storage bucket,
-- and access policy the app needs, in one file. Safe to run any number of
-- times against the same project — every statement is idempotent (tables
-- use IF NOT EXISTS, columns use ADD COLUMN IF NOT EXISTS, buckets use ON
-- CONFLICT DO NOTHING, and every policy is dropped before being
-- re-created).
--
-- Run this once in your Supabase project's SQL editor. If you've already
-- run some of the individual <feature>_schema.sql files, that's fine —
-- re-running their statements here is a no-op for anything that already
-- matches.

-- ============================================================
-- Tables
-- ============================================================

create table if not exists public.plants (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  common_name text not null,
  scientific_name text,
  nickname text,
  category text not null check (category in ('indoor', 'outdoor', 'hydroponics', 'greenhouse', 'balcony')),
  location_id uuid,
  status text not null check (status in ('seedling', 'growing', 'mature', 'dormant')),
  source text not null check (source in ('seed', 'seedling', 'shop_bought', 'propagated', 'gifted')),
  date_acquired date,
  date_planted date,
  pot_size text,
  soil_type text,
  last_watered timestamptz,
  last_fed timestamptz,
  notes text,
  is_wishlist boolean not null default false,
  cover_photo_url text,
  photos text[] not null default '{}',
  created_at timestamptz not null default now()
);
create index if not exists plants_user_id_idx on public.plants (user_id);

-- Pet Safety Quick View + Harvest & Food Tracking's edible flag.
alter table public.plants
  add column if not exists pet_safety text not null default 'unknown'
    check (pet_safety in ('safe', 'toxic', 'unknown'));
alter table public.plants
  add column if not exists is_edible boolean not null default false;

create table if not exists public.garden_spaces (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  type text not null check (
    type in ('indoor_room', 'outdoor_garden', 'raised_bed', 'allotment', 'balcony')
  ),
  canvas_json jsonb,
  photos text[] not null default '{}',
  created_at timestamptz not null default now()
);
create index if not exists garden_spaces_user_id_idx on public.garden_spaces (user_id);

create table if not exists public.space_photo_angles (
  id uuid primary key default gen_random_uuid(),
  space_id uuid not null references public.garden_spaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  label text not null,
  custom_label text,
  photo_url text not null,
  pins jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists space_photo_angles_space_id_idx on public.space_photo_angles (space_id);

create table if not exists public.care_log (
  id uuid primary key default gen_random_uuid(),
  plant_id uuid not null references public.plants (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  action_type text not null check (action_type in ('watered', 'fed', 'pruned', 'harvested', 'sown')),
  notes text,
  photo_url text,
  logged_at timestamptz not null default now()
);
create index if not exists care_log_plant_id_idx on public.care_log (plant_id);
create index if not exists care_log_user_id_idx on public.care_log (user_id);

create table if not exists public.care_tasks (
  id uuid primary key default gen_random_uuid(),
  plant_id uuid not null references public.plants (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  task_type text not null check (task_type in ('water', 'feed', 'prune', 'harvest', 'succession')),
  due_date date not null,
  completed boolean not null default false,
  snoozed_until date,
  repeat_interval_days integer,
  notes text,
  created_at timestamptz not null default now()
);
create index if not exists care_tasks_user_id_idx on public.care_tasks (user_id);
create index if not exists care_tasks_plant_id_idx on public.care_tasks (plant_id);
create index if not exists care_tasks_due_date_idx on public.care_tasks (due_date);

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
create index if not exists harvest_log_plant_id_idx on public.harvest_log (plant_id);
create index if not exists harvest_log_user_id_harvested_at_idx on public.harvest_log (user_id, harvested_at);

create table if not exists public.identification_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  photo_url text not null,
  result_name text not null,
  confidence numeric not null,
  created_at timestamptz not null default now()
);
create index if not exists identification_log_user_id_idx on public.identification_log (user_id);

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
create index if not exists plant_progress_photos_plant_id_idx on public.plant_progress_photos (plant_id);

create table if not exists public.achievements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  achievement_id text not null check (
    achievement_id in (
      'first_steps', 'week_streak', 'plant_detective', 'growing_collection',
      'photographer', 'garden_mapper', 'dedicated_gardener', 'hydration_hero',
      'harvest_time', 'propagator'
    )
  ),
  earned_at timestamptz not null default now(),
  unique (user_id, achievement_id)
);
create index if not exists achievements_user_id_idx on public.achievements (user_id);

create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  plant_id uuid references public.plants (id) on delete set null,
  plant_name text not null,
  poster_name text not null,
  before_photo_url text not null,
  after_photo_url text not null,
  caption text,
  is_public boolean not null default true,
  created_at timestamptz not null default now()
);
create index if not exists posts_created_at_idx on public.posts (created_at desc);

create table if not exists public.post_likes (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (post_id, user_id)
);
create index if not exists post_likes_post_id_idx on public.post_likes (post_id);

-- Succession Planting: 'succession' task_type and 'sown' action_type are
-- already included in the create table statements above for fresh
-- projects. For a project where these tables already existed with the
-- older, narrower check constraints, replace them here.
do $$
declare
  constraint_name text;
begin
  select con.conname into constraint_name
  from pg_constraint con
  join pg_class rel on rel.oid = con.conrelid
  where rel.relname = 'care_tasks'
    and con.contype = 'c'
    and pg_get_constraintdef(con.oid) like '%task_type%'
    and pg_get_constraintdef(con.oid) not like '%succession%';
  if constraint_name is not null then
    execute format('alter table public.care_tasks drop constraint %I', constraint_name);
    alter table public.care_tasks
      add constraint care_tasks_task_type_check
      check (task_type in ('water', 'feed', 'prune', 'harvest', 'succession'));
  end if;
end $$;

do $$
declare
  constraint_name text;
begin
  select con.conname into constraint_name
  from pg_constraint con
  join pg_class rel on rel.oid = con.conrelid
  where rel.relname = 'care_log'
    and con.contype = 'c'
    and pg_get_constraintdef(con.oid) like '%action_type%'
    and pg_get_constraintdef(con.oid) not like '%sown%';
  if constraint_name is not null then
    execute format('alter table public.care_log drop constraint %I', constraint_name);
    alter table public.care_log
      add constraint care_log_action_type_check
      check (action_type in ('watered', 'fed', 'pruned', 'harvested', 'sown'));
  end if;
end $$;

-- ============================================================
-- Storage buckets
-- ============================================================

insert into storage.buckets (id, name, public) values ('plant-photos', 'plant-photos', true) on conflict (id) do nothing;
insert into storage.buckets (id, name, public) values ('space-photos', 'space-photos', true) on conflict (id) do nothing;
insert into storage.buckets (id, name, public) values ('avatar-photos', 'avatar-photos', true) on conflict (id) do nothing;
insert into storage.buckets (id, name, public) values ('identify-photos', 'identify-photos', true) on conflict (id) do nothing;

do $$
declare
  bucket text;
  phrase text;
begin
  foreach bucket in array array['plant-photos', 'space-photos', 'avatar-photos', 'identify-photos']
  loop
    phrase := replace(bucket, '-', ' ');

    execute format('drop policy if exists "Users can upload their own %1$s" on storage.objects', phrase);
    execute format(
      'create policy "Users can upload their own %1$s" on storage.objects for insert with check (bucket_id = %2$L and (storage.foldername(name))[1] = auth.uid()::text)',
      phrase, bucket
    );

    execute format('drop policy if exists "Users can update their own %1$s" on storage.objects', phrase);
    execute format(
      'create policy "Users can update their own %1$s" on storage.objects for update using (bucket_id = %2$L and (storage.foldername(name))[1] = auth.uid()::text)',
      phrase, bucket
    );

    execute format('drop policy if exists "Users can delete their own %1$s" on storage.objects', phrase);
    execute format(
      'create policy "Users can delete their own %1$s" on storage.objects for delete using (bucket_id = %2$L and (storage.foldername(name))[1] = auth.uid()::text)',
      phrase, bucket
    );

    execute format('drop policy if exists "Anyone can view %1$s" on storage.objects', phrase);
    execute format(
      'create policy "Anyone can view %1$s" on storage.objects for select using (bucket_id = %2$L)',
      phrase, bucket
    );
  end loop;
end $$;

-- ============================================================
-- Row-level security policies
-- ============================================================

alter table public.plants enable row level security;
drop policy if exists "Users can view their own plants" on public.plants;
create policy "Users can view their own plants" on public.plants for select using (auth.uid() = user_id);
drop policy if exists "Users can insert their own plants" on public.plants;
create policy "Users can insert their own plants" on public.plants for insert with check (auth.uid() = user_id);
drop policy if exists "Users can update their own plants" on public.plants;
create policy "Users can update their own plants" on public.plants for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "Users can delete their own plants" on public.plants;
create policy "Users can delete their own plants" on public.plants for delete using (auth.uid() = user_id);
drop policy if exists "Anyone can view public wishlist plants" on public.plants;
create policy "Anyone can view public wishlist plants" on public.plants for select using (is_wishlist = true);

alter table public.garden_spaces enable row level security;
drop policy if exists "Users can view their own garden spaces" on public.garden_spaces;
create policy "Users can view their own garden spaces" on public.garden_spaces for select using (auth.uid() = user_id);
drop policy if exists "Users can insert their own garden spaces" on public.garden_spaces;
create policy "Users can insert their own garden spaces" on public.garden_spaces for insert with check (auth.uid() = user_id);
drop policy if exists "Users can update their own garden spaces" on public.garden_spaces;
create policy "Users can update their own garden spaces" on public.garden_spaces for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "Users can delete their own garden spaces" on public.garden_spaces;
create policy "Users can delete their own garden spaces" on public.garden_spaces for delete using (auth.uid() = user_id);

alter table public.space_photo_angles enable row level security;
drop policy if exists "Users can view their own space photo angles" on public.space_photo_angles;
create policy "Users can view their own space photo angles" on public.space_photo_angles for select using (auth.uid() = user_id);
drop policy if exists "Users can insert their own space photo angles" on public.space_photo_angles;
create policy "Users can insert their own space photo angles" on public.space_photo_angles for insert with check (auth.uid() = user_id);
drop policy if exists "Users can update their own space photo angles" on public.space_photo_angles;
create policy "Users can update their own space photo angles" on public.space_photo_angles for update using (auth.uid() = user_id);
drop policy if exists "Users can delete their own space photo angles" on public.space_photo_angles;
create policy "Users can delete their own space photo angles" on public.space_photo_angles for delete using (auth.uid() = user_id);

alter table public.care_log enable row level security;
drop policy if exists "Users can view their own care logs" on public.care_log;
create policy "Users can view their own care logs" on public.care_log for select using (auth.uid() = user_id);
drop policy if exists "Users can insert their own care logs" on public.care_log;
create policy "Users can insert their own care logs" on public.care_log for insert with check (auth.uid() = user_id);
drop policy if exists "Users can update their own care logs" on public.care_log;
create policy "Users can update their own care logs" on public.care_log for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "Users can delete their own care logs" on public.care_log;
create policy "Users can delete their own care logs" on public.care_log for delete using (auth.uid() = user_id);

alter table public.care_tasks enable row level security;
drop policy if exists "Users can view their own care tasks" on public.care_tasks;
create policy "Users can view their own care tasks" on public.care_tasks for select using (auth.uid() = user_id);
drop policy if exists "Users can insert their own care tasks" on public.care_tasks;
create policy "Users can insert their own care tasks" on public.care_tasks for insert with check (auth.uid() = user_id);
drop policy if exists "Users can update their own care tasks" on public.care_tasks;
create policy "Users can update their own care tasks" on public.care_tasks for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "Users can delete their own care tasks" on public.care_tasks;
create policy "Users can delete their own care tasks" on public.care_tasks for delete using (auth.uid() = user_id);

alter table public.harvest_log enable row level security;
drop policy if exists "Users can view their own harvest log" on public.harvest_log;
create policy "Users can view their own harvest log" on public.harvest_log for select using (auth.uid() = user_id);
drop policy if exists "Users can insert their own harvest log" on public.harvest_log;
create policy "Users can insert their own harvest log" on public.harvest_log for insert with check (auth.uid() = user_id);
drop policy if exists "Users can update their own harvest log" on public.harvest_log;
create policy "Users can update their own harvest log" on public.harvest_log for update using (auth.uid() = user_id);
drop policy if exists "Users can delete their own harvest log" on public.harvest_log;
create policy "Users can delete their own harvest log" on public.harvest_log for delete using (auth.uid() = user_id);

alter table public.identification_log enable row level security;
drop policy if exists "Users can view their own identifications" on public.identification_log;
create policy "Users can view their own identifications" on public.identification_log for select using (auth.uid() = user_id);
drop policy if exists "Users can insert their own identifications" on public.identification_log;
create policy "Users can insert their own identifications" on public.identification_log for insert with check (auth.uid() = user_id);
drop policy if exists "Users can delete their own identifications" on public.identification_log;
create policy "Users can delete their own identifications" on public.identification_log for delete using (auth.uid() = user_id);

alter table public.plant_stages enable row level security;
drop policy if exists "Users can view their own plant stages" on public.plant_stages;
create policy "Users can view their own plant stages" on public.plant_stages for select using (auth.uid() = user_id);
drop policy if exists "Users can insert their own plant stages" on public.plant_stages;
create policy "Users can insert their own plant stages" on public.plant_stages for insert with check (auth.uid() = user_id);
drop policy if exists "Users can update their own plant stages" on public.plant_stages;
create policy "Users can update their own plant stages" on public.plant_stages for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "Users can delete their own plant stages" on public.plant_stages;
create policy "Users can delete their own plant stages" on public.plant_stages for delete using (auth.uid() = user_id);

alter table public.plant_milestones enable row level security;
drop policy if exists "Users can view their own plant milestones" on public.plant_milestones;
create policy "Users can view their own plant milestones" on public.plant_milestones for select using (auth.uid() = user_id);
drop policy if exists "Users can insert their own plant milestones" on public.plant_milestones;
create policy "Users can insert their own plant milestones" on public.plant_milestones for insert with check (auth.uid() = user_id);
drop policy if exists "Users can update their own plant milestones" on public.plant_milestones;
create policy "Users can update their own plant milestones" on public.plant_milestones for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "Users can delete their own plant milestones" on public.plant_milestones;
create policy "Users can delete their own plant milestones" on public.plant_milestones for delete using (auth.uid() = user_id);

alter table public.plant_progress_photos enable row level security;
drop policy if exists "Users can view their own progress photos" on public.plant_progress_photos;
create policy "Users can view their own progress photos" on public.plant_progress_photos for select using (auth.uid() = user_id);
drop policy if exists "Users can insert their own progress photos" on public.plant_progress_photos;
create policy "Users can insert their own progress photos" on public.plant_progress_photos for insert with check (auth.uid() = user_id);
drop policy if exists "Users can update their own progress photos" on public.plant_progress_photos;
create policy "Users can update their own progress photos" on public.plant_progress_photos for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "Users can delete their own progress photos" on public.plant_progress_photos;
create policy "Users can delete their own progress photos" on public.plant_progress_photos for delete using (auth.uid() = user_id);

alter table public.achievements enable row level security;
drop policy if exists "Users can view their own achievements" on public.achievements;
create policy "Users can view their own achievements" on public.achievements for select using (auth.uid() = user_id);
drop policy if exists "Users can insert their own achievements" on public.achievements;
create policy "Users can insert their own achievements" on public.achievements for insert with check (auth.uid() = user_id);
drop policy if exists "Users can delete their own achievements" on public.achievements;
create policy "Users can delete their own achievements" on public.achievements for delete using (auth.uid() = user_id);

alter table public.posts enable row level security;
drop policy if exists "Anyone can view public posts" on public.posts;
create policy "Anyone can view public posts" on public.posts for select using (is_public = true or auth.uid() = user_id);
drop policy if exists "Users can insert their own posts" on public.posts;
create policy "Users can insert their own posts" on public.posts for insert with check (auth.uid() = user_id);
drop policy if exists "Users can delete their own posts" on public.posts;
create policy "Users can delete their own posts" on public.posts for delete using (auth.uid() = user_id);

alter table public.post_likes enable row level security;
drop policy if exists "Anyone can view likes" on public.post_likes;
create policy "Anyone can view likes" on public.post_likes for select using (true);
drop policy if exists "Users can like posts as themselves" on public.post_likes;
create policy "Users can like posts as themselves" on public.post_likes for insert with check (auth.uid() = user_id);
drop policy if exists "Users can remove their own like" on public.post_likes;
create policy "Users can remove their own like" on public.post_likes for delete using (auth.uid() = user_id);
