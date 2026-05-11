import { assertOrganizerOwnsEventRoute } from "@/lib/organizer/organizerEventScope";
import type { ReactNode } from "react";

type Props = { children: ReactNode; params: Promise<{ eventId: string }> };

/** Single-event scope: reject foreign event IDs and send organizers without an event to onboarding */
export default async function OrganizerEventSegmentLayout({ children, params }: Props) {
  const { eventId } = await params;
  await assertOrganizerOwnsEventRoute(eventId);
  return children;
}
