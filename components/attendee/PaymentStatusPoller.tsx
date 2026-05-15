"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { checkOrderStatusAction } from "@/app/attendee/event/actions";

type Props = {
  orderId: string;
  redirectTo?: string;
};

/**
 * Polls for order status until it becomes paid.
 * Once paid, refreshes the page to show tickets/seat selection.
 */
export function PaymentStatusPoller({ orderId, redirectTo = "/attendee/event/seats" }: Props) {
  const router = useRouter();
  const [isDone, setIsDone] = useState(false);

  useEffect(() => {
    if (!orderId || isDone) return;

    let timer: NodeJS.Timeout;

    async function poll() {
      try {
        const result = await checkOrderStatusAction(orderId);
        if ("isPaid" in result && result.isPaid) {
          setIsDone(true);
          router.push(redirectTo);
        } else {
          // Poll again in 3 seconds
          timer = setTimeout(poll, 3000);
        }
      } catch (e) {
        console.error("Polling error:", e);
        timer = setTimeout(poll, 5000);
      }
    }

    poll();

    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [orderId, isDone, redirectTo, router]);

  if (isDone) return null;

  return (
    <div className="flex items-center gap-2 text-xs text-muted-foreground italic">
      <div className="h-2 w-2 animate-pulse rounded-full bg-primary" />
      Waiting for payment confirmation...
    </div>
  );
}
