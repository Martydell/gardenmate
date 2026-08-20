-- Creates (or re-creates) all four storage buckets GardenMate needs, plus
-- their access policies. Safe to run any number of times — bucket inserts
-- are `on conflict do nothing` and every policy is dropped before being
-- re-created, so this won't fail even if some of it already exists.
--
-- Run this once in your Supabase project's SQL editor if you're seeing
-- "Bucket not found" errors when uploading photos.

insert into storage.buckets (id, name, public) values ('plant-photos', 'plant-photos', true) on conflict (id) do nothing;
insert into storage.buckets (id, name, public) values ('space-photos', 'space-photos', true) on conflict (id) do nothing;
insert into storage.buckets (id, name, public) values ('avatar-photos', 'avatar-photos', true) on conflict (id) do nothing;
insert into storage.buckets (id, name, public) values ('identify-photos', 'identify-photos', true) on conflict (id) do nothing;

do $$
declare
  bucket text;
  phrase text;
begin
  foreach bucket in array array['plant-photos', 'space-photos', 'avatar-photos', 'identify-photos']
  loop
    phrase := replace(bucket, '-', ' ');

    execute format('drop policy if exists "Users can upload their own %1$s" on storage.objects', phrase);
    execute format(
      'create policy "Users can upload their own %1$s" on storage.objects for insert with check (bucket_id = %2$L and (storage.foldername(name))[1] = auth.uid()::text)',
      phrase, bucket
    );

    execute format('drop policy if exists "Users can update their own %1$s" on storage.objects', phrase);
    execute format(
      'create policy "Users can update their own %1$s" on storage.objects for update using (bucket_id = %2$L and (storage.foldername(name))[1] = auth.uid()::text)',
      phrase, bucket
    );

    execute format('drop policy if exists "Users can delete their own %1$s" on storage.objects', phrase);
    execute format(
      'create policy "Users can delete their own %1$s" on storage.objects for delete using (bucket_id = %2$L and (storage.foldername(name))[1] = auth.uid()::text)',
      phrase, bucket
    );

    execute format('drop policy if exists "Anyone can view %1$s" on storage.objects', phrase);
    execute format(
      'create policy "Anyone can view %1$s" on storage.objects for select using (bucket_id = %2$L)',
      phrase, bucket
    );
  end loop;
end $$;
