-- Plant identification log + storage bucket for photos captured on the
-- Identify page. Run once in your Supabase project's SQL editor.

create table if not exists public.identification_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  photo_url text not null,
  result_name text not null,
  confidence numeric not null,
  created_at timestamptz not null default now()
);

alter table public.identification_log enable row level security;

create policy "Users can view their own identifications"
  on public.identification_log for select
  using (auth.uid() = user_id);

create policy "Users can insert their own identifications"
  on public.identification_log for insert
  with check (auth.uid() = user_id);

create policy "Users can delete their own identifications"
  on public.identification_log for delete
  using (auth.uid() = user_id);

create index if not exists identification_log_user_id_idx on public.identification_log (user_id);

-- Storage bucket for plant identification snapshots. The app uploads to
-- `${auth.uid()}/<filename>`, so policies scope access by matching the
-- first path segment to the requesting user's id — same convention as the
-- plant-photos, space-photos, and avatar-photos buckets.
insert into storage.buckets (id, name, public)
values ('identify-photos', 'identify-photos', true)
on conflict (id) do nothing;

create policy "Users can upload their own identify photos"
  on storage.objects for insert
  with check (
    bucket_id = 'identify-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Users can update their own identify photos"
  on storage.objects for update
  using (
    bucket_id = 'identify-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Users can delete their own identify photos"
  on storage.objects for delete
  using (
    bucket_id = 'identify-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Anyone can view identify photos"
  on storage.objects for select
  using (bucket_id = 'identify-photos');
