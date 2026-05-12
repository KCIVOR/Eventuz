import { DashboardFrame } from "@/components/layout/DashboardFrame";
import { navSectionsForRole, roleHomeHref } from "@/components/layout/navigation";
import type { ReactNode } from "react";

export default async function OrganizerGeneralLayout({ children }: { children: ReactNode }) {
  const sections = navSectionsForRole("organizer", {});
  const homeHref = roleHomeHref("organizer");

  return (
    <DashboardFrame role="organizer" homeHref={homeHref} navSections={sections}>
      {children}
    </DashboardFrame>
  );
}
