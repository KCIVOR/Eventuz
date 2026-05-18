"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type Props = {
  href: string;
  className?: string;
  children: React.ReactNode;
};

export function ReserveCheckoutLink({ href, className, children }: Props) {
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    function onModalOpen() {
      setLoading(false);
    }

    window.addEventListener("eventuz:checkout-modal-open", onModalOpen);
    return () => window.removeEventListener("eventuz:checkout-modal-open", onModalOpen);
  }, []);

  return (
    <Link
      href={href}
      scroll={false}
      aria-busy={loading}
      onClick={(event) => {
        if (
          event.defaultPrevented ||
          event.metaKey ||
          event.ctrlKey ||
          event.shiftKey ||
          event.altKey ||
          event.button !== 0
        ) {
          return;
        }
        setLoading(true);
      }}
      className={className}
    >
      <span className="inline-flex items-center justify-center gap-2">
        {loading ? (
          <span
            aria-hidden="true"
            className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"
          />
        ) : null}
        <span>{loading ? "Opening..." : children}</span>
      </span>
    </Link>
  );
}
