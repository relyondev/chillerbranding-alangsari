import { getSupabaseClient } from "../lib/supabase/client";

export async function signIn(email: string, password: string) {
  const supabase = getSupabaseClient();
  return supabase.auth.signInWithPassword({ email, password });
}

export async function signOut() {
  const supabase = getSupabaseClient();
  return supabase.auth.signOut();
}

export async function requestPasswordReset(email: string) {
  const supabase = getSupabaseClient();
  return supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/reset-password`,
  });
}

export async function updatePassword(password: string) {
  const supabase = getSupabaseClient();
  return supabase.auth.updateUser({ password });
}

export async function updateEmail(email: string) {
  const supabase = getSupabaseClient();
  return supabase.auth.updateUser({ email });
}
