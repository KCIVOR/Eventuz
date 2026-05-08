import type { ReactNode } from "react";
import type { EventuzRole } from "@/lib/auth/roles";
import { SiteFooter } from "./SiteFooter";
import { SiteHeader } from "./SiteHeader";

const roleLabels: Record<EventuzRole, string> = {
  attendee: "Attendee",
  organizer: "Organizer",
  staff: "Staff",
  super_admin: "Super Admin",
};

type Props = {
  role: EventuzRole;
  title: string;
  children: ReactNode;
};

export function RoleAreaShell({ role, title, children }: Props) {
  return (
    <div className="flex min-h-full flex-col">
      <SiteHeader />
      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-4 py-10 sm:px-6">
        <div className="flex flex-wrap items-center gap-3">
          <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-medium text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
            {roleLabels[role]}
          </span>
          <h1 className="text-xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
            {title}
          </h1>
        </div>
        <div className="rounded-xl border border-dashed border-zinc-300 bg-zinc-50/80 p-8 text-sm text-zinc-600 dark:border-zinc-700 dark:bg-zinc-900/40 dark:text-zinc-400">
          {children}
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
