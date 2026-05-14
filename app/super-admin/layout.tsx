import { DashboardFrame } from "@/components/layout/DashboardFrame";
import { navSectionsForRole, roleHomeHref } from "@/components/layout/navigation";
import { getDashboardUser } from "@/lib/auth/getDashboardUser";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";

export default async function SuperAdminLayout({ children }: { children: ReactNode }) {
  const user = await getDashboardUser();
  if (!user) redirect("/login");

  const sections = navSectionsForRole("super_admin", {});
  const homeHref = roleHomeHref("super_admin");

  return (
    <DashboardFrame role="super_admin" homeHref={homeHref} navSections={sections} user={user}>
      {children}
    </DashboardFrame>
  );
}
