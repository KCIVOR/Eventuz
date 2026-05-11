import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

/**
 * Clears Supabase session cookies, then sends the user to /login.
 * Optional query: ?error=... (shown on login page).
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const errorMsg = url.searchParams.get("error");

  const cookieStore = await cookies();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        },
      },
    }
  );

  await supabase.auth.signOut();

  const login = new URL("/login", url.origin);
  if (errorMsg) {
    login.searchParams.set("error", errorMsg);
  }
  return NextResponse.redirect(login);
}
