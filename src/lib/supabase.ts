import { createClient } from '@supabase/supabase-js';
import { notifyError } from './errorHandling';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY. Copy .env.example to .env and fill in your Supabase project credentials.',
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export const PLANT_PHOTOS_BUCKET = 'plant-photos';

export const SPACE_PHOTOS_BUCKET = 'space-photos';

export const AVATAR_PHOTOS_BUCKET = 'avatar-photos';

export const IDENTIFY_PHOTOS_BUCKET = 'identify-photos';

// Every upload helper below reports the real Supabase error via a toast
// before returning null, rather than leaving callers to show a generic
// "something went wrong" — the specific reason (bucket not found, RLS
// policy violation, file too large, ...) is what actually let past issues
// get diagnosed and fixed. Callers should NOT show their own generic error
// on a null return, to avoid a duplicate, less-useful toast overwriting
// this one.

export async function uploadPlantPhoto(userId: string, file: File): Promise<string | null> {
  const path = `${userId}/${crypto.randomUUID()}-${file.name}`;
  const { error } = await supabase.storage.from(PLANT_PHOTOS_BUCKET).upload(path, file);
  if (error) {
    notifyError(error.message);
    return null;
  }
  const { data } = supabase.storage.from(PLANT_PHOTOS_BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

export async function uploadAvatarPhoto(userId: string, file: File): Promise<string | null> {
  const path = `${userId}/${crypto.randomUUID()}-${file.name}`;
  const { error } = await supabase.storage.from(AVATAR_PHOTOS_BUCKET).upload(path, file);
  if (error) {
    notifyError(error.message);
    return null;
  }
  const { data } = supabase.storage.from(AVATAR_PHOTOS_BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

export async function uploadSpacePhoto(userId: string, file: File): Promise<string | null> {
  const path = `${userId}/${crypto.randomUUID()}-${file.name}`;
  const { error } = await supabase.storage.from(SPACE_PHOTOS_BUCKET).upload(path, file);
  if (error) {
    notifyError(error.message);
    return null;
  }
  const { data } = supabase.storage.from(SPACE_PHOTOS_BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

export async function uploadIdentifyPhoto(userId: string, file: File): Promise<string | null> {
  const path = `${userId}/${crypto.randomUUID()}-${file.name}`;
  const { error } = await supabase.storage.from(IDENTIFY_PHOTOS_BUCKET).upload(path, file);
  if (error) {
    notifyError(error.message);
    return null;
  }
  const { data } = supabase.storage.from(IDENTIFY_PHOTOS_BUCKET).getPublicUrl(path);
  return data.publicUrl;
}
