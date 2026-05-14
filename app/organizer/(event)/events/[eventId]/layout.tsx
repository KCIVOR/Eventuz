import { DashboardFrame } from "@/components/layout/DashboardFrame";
import { navSectionsForRole, roleHomeHref } from "@/components/layout/navigation";
import { assertOrganizerOwnsEventRoute } from "@/lib/organizer/organizerEventScope";
import { getDashboardUser } from "@/lib/auth/getDashboardUser";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";

type Props = { children: ReactNode; params: Promise<{ eventId: string }> };

/** Single-event scope: reject foreign event IDs and send organizers without an event to onboarding */
export default async function OrganizerEventSegmentLayout({ children, params }: Props) {
  const user = await getDashboardUser();
  if (!user) redirect("/login");

  const { eventId } = await params;
  await assertOrganizerOwnsEventRoute(eventId);

  const sections = navSectionsForRole("organizer", { eventId });
  const homeHref = roleHomeHref("organizer");

  return (
    <DashboardFrame role="organizer" homeHref={homeHref} navSections={sections} user={user}>
      {children}
    </DashboardFrame>
  );
}
