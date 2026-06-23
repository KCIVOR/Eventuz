import { authDebug } from "@/lib/auth/debug";
import { safeNextPathForRole } from "@/lib/auth/redirects";
import type { EventuzRole } from "@/lib/auth/roles";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

const ALLOWED_EMAIL_OTP_TYPES = new Set([
  "signup",
  "invite",
  "magiclink",
  "recovery",
  "email_change",
  "email",
]);

export async function GET(request: Request) {
  const url = new URL(request.url);
  const tokenHash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type") ?? "signup";
  const nextRaw = url.searchParams.get("next");

  if (!tokenHash || !ALLOWED_EMAIL_OTP_TYPES.has(type)) {
    return NextResponse.redirect(new URL("/login?error=invalid_confirmation_link", url.origin));
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

  const { error } = await supabase.auth.verifyOtp({
    token_hash: tokenHash,
    type,
  });

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

  authDebug("confirm.profile", {
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
  const nextForRole = safeNextPathForRole(
    nextRaw && nextRaw !== "/" ? nextRaw : null,
    role
  );

  return NextResponse.redirect(new URL(nextForRole, url.origin));
}
