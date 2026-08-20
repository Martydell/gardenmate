-- Garden spaces table + storage bucket for GardenMate's garden map feature.
-- Run this once in your Supabase project's SQL editor.

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

alter table public.garden_spaces enable row level security;

create policy "Users can view their own garden spaces"
  on public.garden_spaces for select
  using (auth.uid() = user_id);

create policy "Users can insert their own garden spaces"
  on public.garden_spaces for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own garden spaces"
  on public.garden_spaces for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete their own garden spaces"
  on public.garden_spaces for delete
  using (auth.uid() = user_id);

create index if not exists garden_spaces_user_id_idx on public.garden_spaces (user_id);

-- Storage bucket for garden space background photos. The app uploads to
-- `${auth.uid()}/<filename>`, so policies scope access by matching the
-- first path segment to the requesting user's id.
insert into storage.buckets (id, name, public)
values ('space-photos', 'space-photos', true)
on conflict (id) do nothing;

create policy "Users can upload their own space photos"
  on storage.objects for insert
  with check (
    bucket_id = 'space-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Users can update their own space photos"
  on storage.objects for update
  using (
    bucket_id = 'space-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Users can delete their own space photos"
  on storage.objects for delete
  using (
    bucket_id = 'space-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Anyone can view space photos"
  on storage.objects for select
  using (bucket_id = 'space-photos');
