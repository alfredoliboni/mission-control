import { createClient as createSupabaseClient } from "@supabase/supabase-js";

/**
 * Server-only Supabase client with the service role key.
 * Use this for storage operations and admin-level DB access.
 * NEVER import this from client components.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  }

  return createSupabaseClient(url, serviceRoleKey, {
    auth: { persistSession: false },
  });
}
