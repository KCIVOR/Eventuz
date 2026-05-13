import { type NextRequest, NextResponse } from "next/server";
import {
  authCookieNamesForLog,
  authDebug,
  authSupabaseApiHost,
  isAuthDebugVerbose,
} from "@/lib/auth/debug";
import {
  getRequiredRoleForPathname,
  roleMatchesProfile,
} from "@/lib/auth/guards";
import type { EventuzRole } from "@/lib/auth/roles";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  const { response, supabase } = await updateSession(request);
  const pathname = request.nextUrl.pathname;
  const requiredRole = getRequiredRoleForPathname(pathname);

  if (!requiredRole) {
    return response;
  }

  if (isAuthDebugVerbose()) {
    authDebug("middleware.request", {
      pathname,
      requiredRole,
      supabaseApiHost: authSupabaseApiHost(),
      requestHost: request.nextUrl.hostname,
      ...authCookieNamesForLog(request.cookies.getAll()),
    });
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    const all = request.cookies.getAll();
    authDebug("middleware.no_user", {
      pathname,
      requiredRole,
      redirect: "login",
      supabaseApiHost: authSupabaseApiHost(),
      requestHost: request.nextUrl.hostname,
      ...authCookieNamesForLog(all),
      incomingCookieCount: all.length,
      incomingCookieNamesSample: all.slice(0, 20).map((c) => c.name),
    });
    const url = new URL("/login", request.url);
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("role, status")
    .eq("id", user.id)
    .single();

  if (error || !profile?.role) {
    authDebug("middleware.guard", {
      pathname,
      userId: user.id,
      ok: false,
      role: profile?.role ?? null,
      err: error
        ? {
            message: error.message,
            code: error.code,
            details: error.details,
            hint: error.hint,
          }
        : null,
    });
    return NextResponse.redirect(new URL("/", request.url));
  }

  if (profile.status === "disabled") {
    authDebug("middleware.disabled", {
      pathname,
      userId: user.id,
    });
    const out = new URL("/auth/sign-out", request.url);
    out.searchParams.set(
      "error",
      "This account has been disabled. Contact the organizer if you believe this is a mistake."
    );
    return NextResponse.redirect(out);
  }

  if (!roleMatchesProfile(profile.role as EventuzRole, requiredRole)) {
    authDebug("middleware.role_mismatch", {
      pathname,
      profileRole: profile.role,
      requiredRole,
      userId: user.id,
    });
    return NextResponse.redirect(new URL("/", request.url));
  }

  return response;
}

export const config = {
  matcher: [
    "/organizer",
    "/organizer/:path*",
    "/attendee",
    "/attendee/:path*",
    "/staff",
    "/staff/:path*",
    "/super-admin",
    "/super-admin/:path*",
  ],
};
