-- Multiple Photo Angles Per Space (Improvement 7)
-- Lets a user upload several labelled photos of the same garden_spaces row
-- (e.g. "North wall", "Overhead") and place plant pins independently on each
-- one — the canvas in garden_spaces.canvas_json only supports one background.

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

alter table public.space_photo_angles enable row level security;

create policy "Users can view their own space photo angles"
  on public.space_photo_angles for select
  using (auth.uid() = user_id);

create policy "Users can insert their own space photo angles"
  on public.space_photo_angles for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own space photo angles"
  on public.space_photo_angles for update
  using (auth.uid() = user_id);

create policy "Users can delete their own space photo angles"
  on public.space_photo_angles for delete
  using (auth.uid() = user_id);

create index if not exists space_photo_angles_space_id_idx on public.space_photo_angles (space_id);
