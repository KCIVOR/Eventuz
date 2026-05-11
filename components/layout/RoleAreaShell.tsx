import type { ReactNode } from "react";
import type { EventuzRole } from "@/lib/auth/roles";
import type { BreadcrumbItem } from "./Breadcrumbs";
import { DashboardFrame } from "./DashboardFrame";
import { PageHeader } from "./PageHeader";
import { navSectionsForRole, roleHomeHref, type NavContext } from "./navigation";

type Props = {
  role: EventuzRole;
  title: string;
  description?: string;
  children: ReactNode;
  /** Shown in the top bar when `showPageHeader` is false (avoids duplicating the main H1). */
  compactTitle?: string;
  /** `flush` removes the inner content panel wrapper for full-width dashboards. */
  layout?: "panel" | "flush";
  /** `wide` uses `max-w-7xl` in the main column. */
  mainWidth?: "default" | "wide";
  /** Supplies event-scoped organizer/staff links when applicable. */
  navContext?: NavContext;
  breadcrumbs?: BreadcrumbItem[];
  actions?: ReactNode;
  /** When false, only `compactTitle` (or `title`) appears in the sticky top bar — use for custom in-page heroes. */
  showPageHeader?: boolean;
};

export function RoleAreaShell({
  role,
  title,
  description,
  compactTitle,
  children,
  layout = "panel",
  mainWidth = "default",
  navContext,
  breadcrumbs,
  actions,
  showPageHeader = true,
}: Props) {
  const sections = navSectionsForRole(role, navContext ?? {});
  const homeHref = roleHomeHref(role);
  const maxW = mainWidth === "wide" ? "max-w-7xl" : "max-w-5xl";

  const topBarTitle = showPageHeader ? compactTitle : (compactTitle ?? title);

  const inner = (
    <>
      {showPageHeader ? (
        <PageHeader
          title={title}
          description={description}
          breadcrumbs={breadcrumbs}
          actions={actions}
        />
      ) : null}
      {layout === "flush" ? (
        <div className="space-y-8">{children}</div>
      ) : (
        <div className="rounded-2xl border border-border/70 bg-card/50 p-6 shadow-[0_1px_3px_rgba(28,25,23,0.04)] sm:p-8">
          {children}
        </div>
      )}
    </>
  );

  return (
    <DashboardFrame
      role={role}
      homeHref={homeHref}
      navSections={sections}
      compactTitle={topBarTitle}
    >
      <div className={`mx-auto w-full ${maxW} px-4 py-8 sm:px-6 sm:py-10`}>{inner}</div>
    </DashboardFrame>
  );
}
