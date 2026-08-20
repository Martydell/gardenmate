-- Succession Planting: adds 'succession' as a valid care_tasks.task_type and
-- 'sown' as a valid care_log.action_type (completing a succession task logs
-- a 'sown' action). Run once in your Supabase project's SQL editor.
--
-- CHECK constraints can't have a value added in place, so this looks up and
-- drops whatever the existing constraint on each column is actually called
-- (rather than assuming Postgres's default auto-generated name) before
-- adding the replacement — safer than guessing a constraint name blind.

do $$
declare
  constraint_name text;
begin
  select con.conname into constraint_name
  from pg_constraint con
  join pg_class rel on rel.oid = con.conrelid
  where rel.relname = 'care_tasks'
    and con.contype = 'c'
    and pg_get_constraintdef(con.oid) like '%task_type%';
  if constraint_name is not null then
    execute format('alter table public.care_tasks drop constraint %I', constraint_name);
  end if;
end $$;

alter table public.care_tasks
  add constraint care_tasks_task_type_check
  check (task_type in ('water', 'feed', 'prune', 'harvest', 'succession'));

do $$
declare
  constraint_name text;
begin
  select con.conname into constraint_name
  from pg_constraint con
  join pg_class rel on rel.oid = con.conrelid
  where rel.relname = 'care_log'
    and con.contype = 'c'
    and pg_get_constraintdef(con.oid) like '%action_type%';
  if constraint_name is not null then
    execute format('alter table public.care_log drop constraint %I', constraint_name);
  end if;
end $$;

alter table public.care_log
  add constraint care_log_action_type_check
  check (action_type in ('watered', 'fed', 'pruned', 'harvested', 'sown'));
