-- Achievements table + avatar photo storage bucket for GardenMate's Profile
-- page. Run this once in your Supabase project's SQL editor.

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

alter table public.achievements enable row level security;

create policy "Users can view their own achievements"
  on public.achievements for select
  using (auth.uid() = user_id);

create policy "Users can insert their own achievements"
  on public.achievements for insert
  with check (auth.uid() = user_id);

create policy "Users can delete their own achievements"
  on public.achievements for delete
  using (auth.uid() = user_id);

create index if not exists achievements_user_id_idx on public.achievements (user_id);

-- Storage bucket for profile avatar photos. The app uploads to
-- `${auth.uid()}/<filename>`, so policies scope access by matching the
-- first path segment to the requesting user's id — same convention as the
-- plant-photos and space-photos buckets.
insert into storage.buckets (id, name, public)
values ('avatar-photos', 'avatar-photos', true)
on conflict (id) do nothing;

create policy "Users can upload their own avatar photos"
  on storage.objects for insert
  with check (
    bucket_id = 'avatar-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Users can update their own avatar photos"
  on storage.objects for update
  using (
    bucket_id = 'avatar-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Users can delete their own avatar photos"
  on storage.objects for delete
  using (
    bucket_id = 'avatar-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Anyone can view avatar photos"
  on storage.objects for select
  using (bucket_id = 'avatar-photos');
