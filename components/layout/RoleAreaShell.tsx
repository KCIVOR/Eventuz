import type { ReactNode } from "react";
import type { EventuzRole } from "@/lib/auth/roles";
import type { BreadcrumbItem } from "./Breadcrumbs";
import { DashboardFrame } from "./DashboardFrame";
import { PageHeader } from "./PageHeader";
import { createClient } from "@/lib/supabase/server";
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
  /** When true, the surrounding DashboardFrame (sidebar/nav) is omitted — used when a parent layout already provides the frame. */
  withoutFrame?: boolean;
};

export async function RoleAreaShell({
  role,
  title,
  description,
  compactTitle,
  children,
  layout = "panel",
  mainWidth = "default",
  navContext: initialNavContext,
  breadcrumbs,
  actions,
  showPageHeader = true,
  withoutFrame = false,
}: Props) {
  let navContext = initialNavContext ?? {};

  // If organizer/staff and no eventId, try to find the "active" one to populate sidebar
  if ((role === "organizer" || role === "staff") && !navContext.eventId) {
    const { getActiveEventId } = await import("@/lib/auth/getDashboardUser");
    const supabase = await createClient();
    const { data: { user: authUser } } = await supabase.auth.getUser();

    if (authUser) {
      const activeId = await getActiveEventId(role, authUser.id);
      if (activeId) {
        navContext = { ...navContext, eventId: activeId };
      }
    }
  }

  const sections = navSectionsForRole(role, navContext);
  const homeHref = roleHomeHref(role);
  const maxW = mainWidth === "wide" ? "max-w-7xl" : "max-w-5xl";

  const topBarTitle = showPageHeader ? compactTitle : (compactTitle ?? title);

  // Fetch user profile for the top bar dropdown
  const { getDashboardUser } = await import("@/lib/auth/getDashboardUser");
  const user = await getDashboardUser();

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
        <div className="space-y-10">{children}</div>
      ) : (
        // DS Panel — .card style with sharp corners
        <div
          className="p-6 sm:p-10"
          style={{
            background: "#fff",
            border: "1px solid #EDE8E3",
            borderRadius: "2px",
            boxShadow: "0 2px 12px rgba(26,21,18,0.03)"
          }}
        >
          {children}
        </div>
      )}
    </>
  );

  const content = <div className={`mx-auto w-full ${maxW} px-4 py-8 sm:px-6 sm:py-12`}>{inner}</div>;

  if (withoutFrame) {
    return content;
  }

  return (
    <DashboardFrame
      role={role}
      homeHref={homeHref}
      navSections={sections}
      compactTitle={topBarTitle}
      user={user!}
    >
      {content}
    </DashboardFrame>
  );
}
