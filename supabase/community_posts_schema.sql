-- Before/After Community Showcase. Run once in your Supabase project's SQL
-- editor (after plants_schema.sql).
--
-- plant_name and poster_name are deliberately denormalized (copied in at
-- post-creation time, not joined live) rather than read from `plants` or
-- `auth.users` at feed-render time: the Dashboard's public feed shows posts
-- from EVERY user, and there's no RLS path to let one user read another
-- user's arbitrary plant rows or auth profile data. Snapshotting the display
-- text avoids needing either.

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

alter table public.posts enable row level security;

create policy "Anyone can view public posts"
  on public.posts for select
  using (is_public = true or auth.uid() = user_id);

create policy "Users can insert their own posts"
  on public.posts for insert
  with check (auth.uid() = user_id);

create policy "Users can delete their own posts"
  on public.posts for delete
  using (auth.uid() = user_id);

create index if not exists posts_created_at_idx on public.posts (created_at desc);

create table if not exists public.post_likes (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (post_id, user_id)
);

alter table public.post_likes enable row level security;

create policy "Anyone can view likes"
  on public.post_likes for select
  using (true);

create policy "Users can like posts as themselves"
  on public.post_likes for insert
  with check (auth.uid() = user_id);

create policy "Users can remove their own like"
  on public.post_likes for delete
  using (auth.uid() = user_id);

create index if not exists post_likes_post_id_idx on public.post_likes (post_id);
