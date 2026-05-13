import { createBrowserClient } from "@supabase/ssr";

const supabaseCookieOptions = {
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
};

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookieOptions: supabaseCookieOptions }
  );
}
