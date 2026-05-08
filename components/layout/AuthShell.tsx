import type { ReactNode } from "react";
import Link from "next/link";
import { SiteFooter } from "./SiteFooter";

type Props = {
  title: string;
  children: ReactNode;
};

export function AuthShell({ title, children }: Props) {
  return (
    <div className="flex min-h-full flex-col">
      <div className="border-b border-zinc-200/80 bg-white/80 px-4 py-4 backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/80 sm:px-6">
        <Link
          href="/"
          className="text-sm font-semibold text-zinc-900 dark:text-zinc-50"
        >
          ← Eventuz
        </Link>
      </div>
      <main className="flex flex-1 flex-col items-center justify-center px-4 py-16">
        <div className="w-full max-w-sm rounded-xl border border-zinc-200 bg-white p-8 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <h1 className="mb-6 text-center text-lg font-semibold text-zinc-900 dark:text-zinc-50">
            {title}
          </h1>
          {children}
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
