import {
  createClient,
  type Session,
  type SupabaseClient,
} from "@supabase/supabase-js";

const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL as string | undefined) ?? "";
const supabaseAnonKey =
  (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined) ?? "";

let client: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient {
  if (!client) {
    client = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
      },
    });
  }
  return client;
}

export async function signInWithEmail(
  email: string,
  password: string,
): Promise<{ session: Session | null; error?: string }> {
  const { data, error } = await getSupabaseClient().auth.signInWithPassword({
    email,
    password,
  });
  if (error) {
    return { session: null, error: error.message };
  }
  return { session: data.session };
}

export async function signOut(): Promise<{ error?: string }> {
  const { error } = await getSupabaseClient().auth.signOut();
  return { error: error?.message };
}

export async function getSession(): Promise<Session | null> {
  const { data } = await getSupabaseClient().auth.getSession();
  return data.session;
}

export async function signInWithOAuth(
  provider: "google" | "discord",
): Promise<{ error?: string }> {
  const { error } = await getSupabaseClient().auth.signInWithOAuth({
    provider,
    options: { redirectTo: "http://localhost:34115/#/auth/callback" },
  });
  return { error: error?.message };
}