import { DashboardFrame } from "@/components/layout/DashboardFrame";
import { navSectionsForRole, roleHomeHref } from "@/components/layout/navigation";
import type { ReactNode } from "react";

type Props = { children: ReactNode; params: Promise<{ eventId: string }> };

export default async function StaffEventSegmentLayout({ children, params }: Props) {
  const { eventId } = await params;
  const sections = navSectionsForRole("staff", { eventId });
  const homeHref = roleHomeHref("staff");

  return (
    <DashboardFrame role="staff" homeHref={homeHref} navSections={sections}>
      {children}
    </DashboardFrame>
  );
}
