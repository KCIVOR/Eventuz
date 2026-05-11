import type { ReactNode } from "react";
import { SiteFooter } from "./SiteFooter";
import { SiteHeader } from "./SiteHeader";

type Props = {
  children: ReactNode;
};

export function PublicShell({ children }: Props) {
  return (
    <div className="flex min-h-full flex-col">
      <SiteHeader />
      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col bg-[var(--surface-app)] px-4 py-10 sm:px-6 sm:py-12">
        {children}
      </main>
      <SiteFooter />
    </div>
  );
}
