-- One-time repair for tables that got created with the wrong `id` type.
--
-- Why: if a table was ever created by hand in Supabase's Table Editor UI
-- (rather than by running one of this project's schema files), its `id`
-- column defaults to `bigint generated always as identity` instead of the
-- `uuid primary key default gen_random_uuid()` every schema file and the
-- app's TypeScript types expect. That mismatch surfaces as errors like
-- "foreign key constraint ... incompatible types: uuid and bigint" the
-- first time a table that references it is created.
--
-- What this does: for every table GardenMate uses, if its `id` column is
-- not uuid AND the table is empty, it's dropped so complete_setup.sql can
-- recreate it correctly. If the table has any rows, it is left completely
-- untouched and a NOTICE is raised instead — nothing with real data in it
-- is ever dropped by this script.
--
-- Run this once, BEFORE complete_setup.sql, in your Supabase SQL editor.
-- Check the "Messages" panel after running for a report of what happened.

do $$
declare
  tbl text;
  id_type text;
  row_count bigint;
begin
  -- Children before parents, so an empty child clears out of the way
  -- before its parent is dropped (a plain, non-cascading DROP would
  -- otherwise fail on the parent while a since-emptied child's old FK
  -- constraint is still attached to it).
  foreach tbl in array array[
    'space_photo_angles', 'care_log', 'care_tasks', 'harvest_log',
    'plant_stages', 'plant_milestones', 'plant_progress_photos', 'post_likes',
    'identification_log', 'achievements', 'posts', 'garden_spaces', 'plants'
  ]
  loop
    if to_regclass('public.' || tbl) is null then
      raise notice '% : does not exist yet, nothing to do', tbl;
      continue;
    end if;

    select data_type into id_type
    from information_schema.columns
    where table_schema = 'public' and table_name = tbl and column_name = 'id';

    if id_type = 'uuid' then
      raise notice '% : id is already uuid, nothing to do', tbl;
      continue;
    end if;

    execute format('select count(*) from public.%I', tbl) into row_count;

    if row_count = 0 then
      -- No CASCADE on purpose: if some other table still has a foreign key
      -- pointing at this one, a plain DROP fails loudly instead of quietly
      -- ripping out that constraint (or worse) elsewhere. A failure here
      -- just means that other table needs to be looked at too — safer than
      -- guessing.
      execute format('drop table public.%I', tbl);
      raise notice '% : id was % with 0 rows — dropped, will be recreated by complete_setup.sql', tbl, id_type;
    else
      raise notice '% : id is % but has % row(s) — LEFT ALONE, needs a manual migration (ask before touching this one)', tbl, id_type, row_count;
    end if;
  end loop;
end $$;
