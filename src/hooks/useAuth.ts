import { useEffect } from 'react';
import type { Session, User as SupabaseUser } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { useUserStore } from '../stores/userStore';
import type { User } from '../types';

function metadataString(metadata: Record<string, unknown>, keys: string[]): string {
  for (const key of keys) {
    const value = metadata[key];
    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }
  }
  return '';
}

function emailLocalPart(email: string | null | undefined): string {
  if (!email) return '';
  return email.split('@')[0]?.trim() ?? '';
}

function mapSupabaseUser(supabaseUser: SupabaseUser): User {
  const metadata = supabaseUser.user_metadata ?? {};

  const fullName = metadataString(metadata, ['name', 'full_name', 'display_name']);
  const firstName = metadataString(metadata, ['first_name', 'given_name']);
  const lastName = metadataString(metadata, ['last_name', 'family_name']);
  const fallbackName = emailLocalPart(supabaseUser.email);
  const name = fullName || `${firstName}${firstName && lastName ? ' ' : ''}${lastName}` || firstName || fallbackName;

  return {
    id: supabaseUser.id,
    email: supabaseUser.email ?? '',
    name,
    first_name: firstName || undefined,
    last_name: lastName || undefined,
    garden_name: metadata.garden_name ?? '',
    theme: metadata.theme ?? null,
    garden_types: metadata.garden_types ?? [],
    avatar_url: metadata.avatar_url ?? null,
    notification_preferences: metadata.notification_preferences ?? null,
    created_at: supabaseUser.created_at,
  };
}

function applySession(session: Session | null) {
  useUserStore.getState().setSession(session);
  useUserStore.getState().setUser(session ? mapSupabaseUser(session.user) : null);
  useUserStore.getState().setLoading(false);
}

export function useAuth() {
  const user = useUserStore((state) => state.user);
  const session = useUserStore((state) => state.session);
  const isLoading = useUserStore((state) => state.isLoading);
  const storeSignOut = useUserStore((state) => state.signOut);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      applySession(data.session);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      applySession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    storeSignOut();
  };

  return { user, session, isLoading, signOut };
}
