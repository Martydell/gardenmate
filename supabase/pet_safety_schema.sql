-- Pet Safety Quick View + Harvest & Food Tracking's edible flag. Run once in
-- your Supabase project's SQL editor (after plants_schema.sql).
--
-- pet_safety defaults to 'unknown' and is populated opportunistically the
-- first time a plant's Care Info tab is viewed (see CareInfoCard.tsx), not
-- backfilled in bulk — existing rows will show as 'unknown' until then.
-- is_edible defaults to false and is a plain user-set flag (see
-- AddPlantModal.tsx's "Edible plant" checkbox), not Perenual-derived.

alter table public.plants
  add column if not exists pet_safety text not null default 'unknown'
    check (pet_safety in ('safe', 'toxic', 'unknown'));

alter table public.plants
  add column if not exists is_edible boolean not null default false;
