-- Shareable Wishlists: allows anyone (including unauthenticated visitors) to
-- read a user's WISHLIST plants only, so /wishlist/:userId can work without
-- a login. Run once in your Supabase project's SQL editor (after
-- plants_schema.sql). This does not loosen access to non-wishlist plants —
-- the existing owner-only select policy from plants_schema.sql still applies
-- to those, this just adds an additional policy (policies are OR'd together).

create policy "Anyone can view public wishlist plants"
  on public.plants for select
  using (is_wishlist = true);
