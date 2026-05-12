import { DashboardFrame } from "@/components/layout/DashboardFrame";
import { navSectionsForRole, roleHomeHref } from "@/components/layout/navigation";
import type { ReactNode } from "react";

export default async function SuperAdminLayout({ children }: { children: ReactNode }) {
  const sections = navSectionsForRole("super_admin", {});
  const homeHref = roleHomeHref("super_admin");

  return (
    <DashboardFrame role="super_admin" homeHref={homeHref} navSections={sections}>
      {children}
    </DashboardFrame>
  );
}
