-- Plant identification log. Run once in your Supabase project's SQL
-- editor. Note: Identify.tsx's camera-capture + identification-API flow
-- itself is not built yet — this table backs the ID Log list/empty state
-- only, so it's ready to receive rows once that capture flow ships.

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
