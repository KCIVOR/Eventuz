import { RoleAreaShell } from "@/components/layout/RoleAreaShell";
import { SeatAssignmentForm } from "@/components/attendee/SeatAssignmentForm";
import { loadSeatAssignmentPage } from "@/lib/attendee/loadSeatAssignmentPage";
import Link from "next/link";
import { redirect } from "next/navigation";

import type { ReactNode } from "react";

type Props = { searchParams: Promise<{ order?: string }> };

function Shell(props: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <RoleAreaShell
      role="attendee"
      layout="flush"
      mainWidth="wide"
      title={props.title}
      description={props.description}
      breadcrumbs={[
        { label: "Your invitation", href: "/attendee/event" },
        { label: "Choose seats" },
      ]}
    >
      <div className="mx-auto max-w-lg px-1 sm:px-0">{props.children}</div>
    </RoleAreaShell>
  );
}

export default async function AttendeeSeatAssignmentPage({ searchParams }: Props) {
  const q = await searchParams;
  const ctx = await loadSeatAssignmentPage(q.order);

  if (!ctx.ok) {
    if (ctx.redirectToLogin) {
      const next = q.order
        ? `/attendee/event/seats?order=${encodeURIComponent(q.order)}`
        : "/attendee/event/seats";
      redirect(`/login?next=${encodeURIComponent(next)}`);
    }

    if (ctx.variant === "choose_order" && ctx.seatWorkOrders?.length) {
      return (
        <Shell
          title="Choose seats"
          description="Pick which paid order you’re assigning seats for."
        >
          <div className="space-y-6">
            <p className="text-center text-sm leading-relaxed text-muted-foreground">{ctx.message}</p>
            <ul className="space-y-3">
              {ctx.seatWorkOrders.map((o) => (
                <li key={o.id}>
                  <Link
                    href={`/attendee/event/seats?order=${encodeURIComponent(o.id)}`}
                    className="flex min-h-12 flex-col justify-center rounded-2xl border border-border bg-card px-5 py-4 text-left shadow-[0_2px_12px_rgba(28,25,23,0.06)] transition-colors hover:border-primary/35 hover:bg-muted/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                  >
                    <span className="font-medium text-foreground">{o.ticketTypeName}</span>
                    <span className="mt-1 text-xs text-muted-foreground">
                      {o.quantity} seat{o.quantity === 1 ? "" : "s"} · Continue
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
            <p className="text-center text-xs text-muted-foreground">
              <Link
                href="/attendee/event"
                className="font-medium text-primary underline-offset-4 hover:text-primary-hover hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              >
                Back to your invitation
              </Link>
            </p>
          </div>
        </Shell>
      );
    }

    if (ctx.variant === "locked_need_purchase") {
      return (
        <Shell title="Choose seats" description="Seat selection opens after payment is confirmed.">
          <div
            className="rounded-2xl border border-border bg-card px-6 py-8 text-center shadow-[0_2px_12px_rgba(28,25,23,0.06)]"
            role="status"
          >
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent-gold">Locked</p>
            <p className="mt-3 font-serif text-xl font-semibold text-foreground">Purchase a ticket first</p>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{ctx.message}</p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
              <Link
                href="/attendee/event"
                className="inline-flex min-h-11 items-center justify-center rounded-xl bg-primary px-6 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              >
                View invitation &amp; tickets
              </Link>
              <Link
                href="/attendee/event/tickets"
                className="inline-flex min-h-11 items-center justify-center rounded-xl border border-border bg-background px-6 text-sm font-semibold text-foreground transition-colors hover:bg-muted/60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              >
                Your tickets
              </Link>
            </div>
          </div>
        </Shell>
      );
    }

    return (
      <Shell title="Choose seats">
        <div
          className={`rounded-2xl border px-6 py-6 text-center text-sm leading-relaxed shadow-[0_2px_12px_rgba(28,25,23,0.04)] ${
            ctx.variant === "not_assignable_order"
              ? "border-border bg-muted/20 text-muted-foreground"
              : "border-border bg-card text-muted-foreground"
          }`}
          role={ctx.variant === "invalid_order" ? "alert" : "status"}
        >
          <p>{ctx.message}</p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link
              href="/attendee/event"
              className="inline-flex min-h-10 items-center justify-center rounded-lg border border-border bg-card px-4 text-sm font-semibold text-foreground transition-colors hover:bg-muted/50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            >
              Your invitation
            </Link>
            <Link
              href="/attendee/event/tickets"
              className="inline-flex min-h-10 items-center justify-center rounded-lg border border-primary/25 bg-primary/5 px-4 text-sm font-semibold text-primary transition-colors hover:bg-primary/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            >
              Your tickets
            </Link>
          </div>
        </div>
      </Shell>
    );
  }

  return (
    <RoleAreaShell
      role="attendee"
      layout="flush"
      mainWidth="wide"
      title="Choose seats"
      description={`${ctx.eventName} · ${ctx.ticketTypeName}`}
      breadcrumbs={[
        { label: "Your invitation", href: "/attendee/event" },
        { label: "Choose seats" },
      ]}
    >
      <SeatAssignmentForm
        key={[
          ctx.order.id,
          ...ctx.initialAssignments
            .map((a) => `${a.seat_id}:${a.attendee_name}:${a.attendee_email}`)
            .sort(),
        ].join("|")}
        eventName={ctx.eventName}
        order={ctx.order}
        ticketTypeName={ctx.ticketTypeName}
        seatLayoutMode={ctx.seatLayoutMode}
        seats={ctx.seats}
        initialAssignments={ctx.initialAssignments}
        seatInventoryTotal={ctx.seatInventoryTotal}
      />
    </RoleAreaShell>
  );
}
