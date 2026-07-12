import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { authDebug } from "@/lib/auth/debug";
import type { EventuzRole } from "@/lib/auth/roles";
import { safeNextPathForRole } from "@/lib/auth/redirects";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const nextRaw = url.searchParams.get("next");
  const type = url.searchParams.get("type");

  if (!code) {
    return NextResponse.redirect(new URL("/login?error=missing_code", url.origin));
  }

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

  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    return NextResponse.redirect(
      new URL(`/login?error=${encodeURIComponent(error.message)}`, url.origin)
    );
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(new URL("/login?error=no_user", url.origin));
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role, status")
    .eq("id", user.id)
    .single();

  authDebug("callback.profile", {
    userId: user.id,
    ok: !profileError && !!profile?.role,
    role: profile?.role ?? null,
    status: profile?.status ?? null,
    error: profileError
      ? {
          message: profileError.message,
          code: profileError.code,
          details: profileError.details,
          hint: profileError.hint,
        }
      : null,
  });

  if (profileError || !profile?.role) {
    await supabase.auth.signOut();
    return NextResponse.redirect(
      new URL(
        `/login?error=${encodeURIComponent("Profile missing. Run database migrations.")}`,
        url.origin
      )
    );
  }

  if (profile.status === "disabled") {
    await supabase.auth.signOut();
    return NextResponse.redirect(
      new URL(
        `/login?error=${encodeURIComponent("This account has been disabled.")}`,
        url.origin
      )
    );
  }

  const role = profile.role as EventuzRole;
  if (type === "recovery" || nextRaw === "/reset-password") {
    return NextResponse.redirect(new URL("/reset-password", url.origin));
  }

  const nextForRole = safeNextPathForRole(
    nextRaw && nextRaw !== "/" ? nextRaw : null,
    role
  );

  return NextResponse.redirect(new URL(nextForRole, url.origin));
}
