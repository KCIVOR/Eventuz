import { createClient } from "@supabase/supabase-js";

/**
 * Service Role client for bypass RLS and sensitive backend operations.
 * USE WITH EXTREME CAUTION. Never use this in client-side code.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error("Missing Supabase admin environment variables (URL or SERVICE_ROLE_KEY).");
  }

  return createClient(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
