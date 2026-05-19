"use client";

import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { useTransition } from "react";

type Props = {
  href: string;
  children: ReactNode;
  loadingLabel: string;
  className?: string;
};

export function TicketNavigationLink({ href, children, loadingLabel, className }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <Link
      href={href}
      aria-busy={pending}
      onClick={(event) => {
        if (pending) {
          event.preventDefault();
          return;
        }
        event.preventDefault();
        startTransition(() => {
          router.push(href);
        });
      }}
      className={className}
    >
      <span className="inline-flex items-center justify-center gap-2">
        {pending ? <LoadingSpinner size="sm" /> : null}
        {pending ? loadingLabel : children}
      </span>
    </Link>
  );
}
