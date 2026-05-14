import { DashboardFrame } from "@/components/layout/DashboardFrame";
import { navSectionsForRole, roleHomeHref } from "@/components/layout/navigation";
import { getDashboardUser } from "@/lib/auth/getDashboardUser";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";

export default async function StaffDashboardLayout({ children }: { children: ReactNode }) {
  const userProfile = await getDashboardUser();
  if (!userProfile) redirect("/login");

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  let eventId: string | null = null;
  if (user) {
    const { data: assignment } = await supabase
      .from("event_staff")
      .select("event_id")
      .eq("user_id", user.id)
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    eventId = (assignment?.event_id as string | undefined) ?? null;
  }

  const sections = navSectionsForRole("staff", { eventId });
  const homeHref = roleHomeHref("staff");

  return (
    <DashboardFrame role="staff" homeHref={homeHref} navSections={sections} user={userProfile}>
      {children}
    </DashboardFrame>
  );
}

