import { DashboardFrame } from "@/components/layout/DashboardFrame";
import { navSectionsForRole, roleHomeHref } from "@/components/layout/navigation";
import type { ReactNode } from "react";

export default async function StaffLayout({ children }: { children: ReactNode }) {
  const sections = navSectionsForRole("staff", {});
  const homeHref = roleHomeHref("staff");

  return (
    <DashboardFrame role="staff" homeHref={homeHref} navSections={sections}>
      {children}
    </DashboardFrame>
  );
}
