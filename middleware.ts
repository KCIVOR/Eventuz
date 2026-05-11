import { type NextRequest, NextResponse } from "next/server";
import { authDebug } from "@/lib/auth/debug";
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

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
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
    const out = new URL("/auth/sign-out", request.url);
    out.searchParams.set(
      "error",
      "This account has been disabled. Contact the organizer if you believe this is a mistake."
    );
    return NextResponse.redirect(out);
  }

  if (!roleMatchesProfile(profile.role as EventuzRole, requiredRole)) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return response;
}

export const config = {
  matcher: [
    "/organizer/:path*",
    "/attendee/:path*",
    "/staff/:path*",
    "/super-admin/:path*",
  ],
};
