-- Plants table + storage bucket for GardenMate's plant catalogue feature.
-- Run this once in your Supabase project's SQL editor.

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

alter table public.plants enable row level security;

create policy "Users can view their own plants"
  on public.plants for select
  using (auth.uid() = user_id);

create policy "Users can insert their own plants"
  on public.plants for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own plants"
  on public.plants for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete their own plants"
  on public.plants for delete
  using (auth.uid() = user_id);

create index if not exists plants_user_id_idx on public.plants (user_id);

-- Storage bucket for plant cover photos. The app uploads to
-- `${auth.uid()}/<filename>`, so policies scope access by matching the
-- first path segment to the requesting user's id.
insert into storage.buckets (id, name, public)
values ('plant-photos', 'plant-photos', true)
on conflict (id) do nothing;

create policy "Users can upload their own plant photos"
  on storage.objects for insert
  with check (
    bucket_id = 'plant-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Users can update their own plant photos"
  on storage.objects for update
  using (
    bucket_id = 'plant-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Users can delete their own plant photos"
  on storage.objects for delete
  using (
    bucket_id = 'plant-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Anyone can view plant photos"
  on storage.objects for select
  using (bucket_id = 'plant-photos');
