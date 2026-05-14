import { createClient } from "@/lib/supabase/server";
import { getDashboardUser } from "@/lib/auth/getDashboardUser";
import { navSectionsForRole, roleHomeHref } from "@/components/layout/navigation";
import { DashboardFrame } from "@/components/layout/DashboardFrame";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import type { EventuzRole } from "@/lib/auth/roles";

/**
 * Profile Layout ensures that the profile page is wrapped in the same DashboardFrame
 * as the rest of the application, maintaining the sidebar and header consistency.
 */
export default async function ProfileLayout({ children }: { children: ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/profile");
  }

  // 1. Determine user role for sidebar context
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  const role = (profile?.role as EventuzRole) || "attendee";

  // 2. Fetch shared dashboard user data (name, avatar)
  const userProfile = await getDashboardUser();
  if (!userProfile) redirect("/login");

  // 3. Role-specific context (e.g., event assignment for staff/organizer)
  const { getActiveEventId } = await import("@/lib/auth/getDashboardUser");
  const eventId = await getActiveEventId(role, user.id);

  const sections = navSectionsForRole(role, { eventId });
  const homeHref = roleHomeHref(role);

  return (
    <DashboardFrame 
      role={role} 
      homeHref={homeHref} 
      navSections={sections} 
      user={userProfile}
      compactTitle="Account Settings"
    >
      {children}
    </DashboardFrame>
  );
}
