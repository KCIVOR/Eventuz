"use client";

import { submitSeatAssignments, type SeatAssignmentRow } from "@/app/attendee/event/seats/actions";
import type {
  AssignableOrder,
  ExistingAssignment,
  SeatPickerRow,
} from "@/lib/attendee/loadSeatAssignmentPage";
import { formatPhp } from "@/lib/utils/money";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition, type FormEvent } from "react";

type Props = {
  eventName: string;
  order: AssignableOrder;
  ticketTypeName: string;
  seats: SeatPickerRow[];
  initialAssignments: ExistingAssignment[];
  /** Rows in `seats` for this ticket type (any status). 0 = no seating plan defined */
  seatInventoryTotal: number;
};

type SeatDetail = { name: string; email: string };

function normalizeDetailsMap(
  seatIds: string[],
  prev: Record<string, SeatDetail>,
  initial: ExistingAssignment[]
): Record<string, SeatDetail> {
  const initBySeat = new Map(initial.map((a) => [a.seat_id, a]));
  const next: Record<string, SeatDetail> = {};
  for (const id of seatIds) {
    const fromPrev = prev[id];
    const fromInit = initBySeat.get(id);
    if (fromPrev) {
      next[id] = fromPrev;
    } else if (fromInit) {
      next[id] = { name: fromInit.attendee_name, email: fromInit.attendee_email };
    } else {
      next[id] = { name: "", email: "" };
    }
  }
  return next;
}

export function SeatAssignmentForm({
  eventName,
  order,
  ticketTypeName,
  seats,
  initialAssignments,
  seatInventoryTotal,
}: Props) {
  const qty = order.quantity;
  const initialIds = useMemo(
    () => initialAssignments.map((a) => a.seat_id),
    [initialAssignments]
  );

  const assignmentsKey = useMemo(
    () =>
      [...initialAssignments]
        .map((a) => `${a.seat_id}:${a.attendee_name}:${a.attendee_email}`)
        .sort()
        .join("|"),
    [initialAssignments]
  );

  const [selectedSeatIds, setSelectedSeatIds] = useState<string[]>(() => [...initialIds]);
  const [detailsBySeat, setDetailsBySeat] = useState<Record<string, SeatDetail>>(() =>
    normalizeDetailsMap(initialIds, {}, initialAssignments)
  );
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  useEffect(() => {
    const ids = initialAssignments.map((a) => a.seat_id);
    setSelectedSeatIds(ids);
    setDetailsBySeat(normalizeDetailsMap(ids, {}, initialAssignments));
  }, [assignmentsKey]);

  const labelById = useMemo(() => {
    const m = new Map<string, string>();
    seats.forEach((s) => m.set(s.id, s.display_label));
    return m;
  }, [seats]);

  const sortedSelected = useMemo(() => {
    return [...selectedSeatIds].sort((a, b) =>
      (labelById.get(a) ?? "").localeCompare(labelById.get(b) ?? "", undefined, { numeric: true })
    );
  }, [selectedSeatIds, labelById]);

  function toggleSeat(seatId: string) {
    setError(null);
    setSuccess(null);
    setSelectedSeatIds((prev) => {
      const on = prev.includes(seatId);
      if (on) {
        const next = prev.filter((id) => id !== seatId);
        setDetailsBySeat((d) => normalizeDetailsMap(next, d, initialAssignments));
        return next;
      }
      if (prev.length >= qty) {
        return prev;
      }
      const next = [...prev, seatId];
      setDetailsBySeat((d) => normalizeDetailsMap(next, d, initialAssignments));
      return next;
    });
  }

  function setDetail(seatId: string, field: keyof SeatDetail, value: string) {
    setError(null);
    setSuccess(null);
    setDetailsBySeat((d) => ({
      ...d,
      [seatId]: { ...d[seatId], [field]: value },
    }));
  }

  function validatePayload(): SeatAssignmentRow[] | string {
    if (selectedSeatIds.length < 1) {
      return "Select at least one seat to submit.";
    }
    if (selectedSeatIds.length > qty) {
      return `You can select at most ${qty} seat(s) for this order.`;
    }
    if (new Set(selectedSeatIds).size !== selectedSeatIds.length) {
      return "Duplicate seat selection.";
    }
    const rows: SeatAssignmentRow[] = [];
    for (const seatId of sortedSelected) {
      const det = detailsBySeat[seatId];
      const name = (det?.name ?? "").trim();
      const email = (det?.email ?? "").trim();
      if (!name || !email) {
        return "Every seat needs an attendee name and email.";
      }
      const basicEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!basicEmail.test(email)) {
        return `Enter a valid email for seat ${labelById.get(seatId) ?? seatId}.`;
      }
      rows.push({
        seat_id: seatId,
        attendee_name: name,
        attendee_email: email.toLowerCase(),
      });
    }
    return rows;
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    const check = validatePayload();
    if (typeof check === "string") {
      setError(check);
      return;
    }
    setError(null);
    setSuccess(null);
    startTransition(async () => {
      const res = await submitSeatAssignments(order.id, check);
      if (res && "error" in res) {
        setError(res.error);
        return;
      }
      if (res && "ok" in res && res.ok && res.partial) {
        setSuccess(
          selectedSeatIds.length >= qty
            ? "Submitted. All seats are saved for this order."
            : "Submitted. These seats are saved. Assign every seat in this order before you can generate QR passes — see Your tickets."
        );
        router.refresh();
      }
    });
  }

  const selectionComplete = selectedSeatIds.length === qty;
  const validation = validatePayload();
  const canSubmit = typeof validation !== "string";
  const phpTotal = formatPhp(order.total_amount);

  return (
    <div className="mx-auto max-w-lg space-y-8 px-1 sm:px-0">
      <header className="space-y-3 rounded-2xl border border-border bg-card px-6 py-7 text-center shadow-[0_2px_12px_rgba(28,25,23,0.06)] transition-shadow duration-200 motion-reduce:transition-none sm:px-8">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent-gold">Seat assignment</p>
        <h1 className="font-serif text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
          {eventName}
        </h1>
        <p className="text-sm text-muted-foreground">
          Pick seats, add guest details, and submit. Each submit saves immediately. QR passes become available only after{" "}
          <span className="font-medium text-foreground">all seats in this order</span> are assigned — then open Your
          tickets and generate passes.
        </p>
      </header>

      <section
        className="rounded-2xl border border-border bg-card px-5 py-5 shadow-[0_2px_12px_rgba(28,25,23,0.06)] transition-shadow duration-200 motion-reduce:transition-none sm:px-6"
        aria-labelledby="order-summary-heading"
      >
        <h2 id="order-summary-heading" className="font-serif text-lg font-semibold text-foreground">
          Your paid order
        </h2>
        <dl className="mt-4 space-y-2 text-sm">
          <div className="flex justify-between gap-4 border-b border-border/80 py-2">
            <dt className="text-muted-foreground">Ticket</dt>
            <dd className="text-right font-medium text-foreground">{ticketTypeName}</dd>
          </div>
          <div className="flex justify-between gap-4 border-b border-border/80 py-2">
            <dt className="text-muted-foreground">Quantity</dt>
            <dd className="text-right text-foreground">{qty}</dd>
          </div>
          <div className="flex justify-between gap-4 py-2">
            <dt className="text-muted-foreground">Total paid</dt>
            <dd className="text-right font-semibold text-foreground">{phpTotal}</dd>
          </div>
        </dl>
      </section>

      <form onSubmit={onSubmit} className="space-y-8">
        <fieldset className="space-y-3 rounded-2xl border border-border bg-card px-5 py-5 sm:px-6">
          <legend className="font-serif text-lg font-semibold text-foreground">
            Available seats
          </legend>
          <p className="text-xs leading-relaxed text-muted-foreground">
            Select up to {qty} seat(s) for this ticket type. Tap again to deselect.
            {selectedSeatIds.length > 0 ? (
              <>
                {" "}
                <span className="text-foreground">
                  {selectedSeatIds.length} of {qty} selected.
                </span>
              </>
            ) : null}
          </p>
          <div className="flex flex-wrap gap-2" role="group" aria-label="Seat selection">
            {seatInventoryTotal === 0 ? (
              <p className="text-sm leading-relaxed text-muted-foreground" role="status">
                There isn&apos;t a seating layout for this ticket type yet. If the hosts didn&apos;t plan assigned
                seating, you&apos;re all set — check{" "}
                <span className="font-medium text-foreground">Your tickets</span> for entry passes after checkout.
                Otherwise, the organizer still needs to publish seats.
              </p>
            ) : seats.length === 0 ? (
              <p className="text-sm text-warning" role="status">
                Every seat may be held or assigned right now. Try again later or contact the organizer if this
                persists.
              </p>
            ) : (
              seats.map((s) => {
                const selected = selectedSeatIds.includes(s.id);
                const atCapacity = selectedSeatIds.length >= qty && !selected;
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => toggleSeat(s.id)}
                    disabled={pending || atCapacity}
                    aria-pressed={selected}
                    className={[
                      "min-h-10 min-w-10 cursor-pointer rounded-lg border px-3 py-2 text-sm font-medium transition-colors duration-200 motion-reduce:transition-none",
                      "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
                      selected
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-background text-foreground hover:border-primary/50 hover:bg-muted/40",
                      atCapacity ? "cursor-not-allowed opacity-45 hover:border-border hover:bg-background" : "",
                      pending ? "opacity-60" : "",
                    ].join(" ")}
                  >
                    {s.display_label}
                  </button>
                );
              })
            )}
          </div>
        </fieldset>

        {selectedSeatIds.length > 0 ? (
          <div className="space-y-4 rounded-2xl border border-border bg-card px-5 py-5 sm:px-6">
            <h3 className="font-serif text-lg font-semibold text-foreground">Attendee details</h3>
            <p className="text-xs text-muted-foreground">
              Assign yourself or guests—guests do not need an Eventuz account.
              {!selectionComplete ? (
                <>
                  {" "}
                  Submit below to confirm these seats right away; you can add more seats later from this page.
                </>
              ) : null}
            </p>
            <ul className="space-y-5">
              {sortedSelected.map((seatId) => {
                const label = labelById.get(seatId) ?? seatId;
                const det = detailsBySeat[seatId] ?? { name: "", email: "" };
                const idBase = `seat-${seatId}`;
                return (
                  <li
                    key={seatId}
                    className="rounded-xl border border-border/90 bg-muted/15 px-4 py-4 transition-colors duration-200 motion-reduce:transition-none"
                  >
                    <p className="text-xs font-semibold uppercase tracking-wider text-accent-gold">
                      Seat {label}
                    </p>
                    <div className="mt-3 grid gap-3 sm:grid-cols-2">
                      <div className="space-y-1">
                        <label htmlFor={`${idBase}-name`} className="text-xs font-medium text-muted-foreground">
                          Full name
                        </label>
                        <input
                          id={`${idBase}-name`}
                          className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground transition-shadow duration-200 motion-reduce:transition-none focus-visible:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25"
                          autoComplete="name"
                          value={det.name}
                          onChange={(ev) => setDetail(seatId, "name", ev.target.value)}
                          disabled={pending}
                          required
                        />
                      </div>
                      <div className="space-y-1">
                        <label htmlFor={`${idBase}-email`} className="text-xs font-medium text-muted-foreground">
                          Email
                        </label>
                        <input
                          id={`${idBase}-email`}
                          type="email"
                          className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground transition-shadow duration-200 motion-reduce:transition-none focus-visible:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25"
                          autoComplete="email"
                          value={det.email}
                          onChange={(ev) => setDetail(seatId, "email", ev.target.value)}
                          disabled={pending}
                          required
                        />
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        ) : null}

        {error ? (
          <div
            className="rounded-xl border border-destructive/30 bg-destructive-muted px-4 py-3 text-sm text-destructive"
            role="alert"
          >
            {error}
          </div>
        ) : null}

        {success ? (
          <div
            className="rounded-xl border border-primary/25 bg-primary/5 px-4 py-3 text-sm text-foreground"
            role="status"
          >
            {success}
          </div>
        ) : null}

        <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
          <button
            type="submit"
            disabled={pending || !canSubmit || seats.length === 0 || seatInventoryTotal === 0}
            className="inline-flex min-h-11 cursor-pointer items-center justify-center rounded-xl bg-primary px-6 text-sm font-semibold text-primary-foreground transition-colors duration-200 motion-reduce:transition-none hover:bg-primary-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-45"
          >
            {pending
              ? "Submitting…"
              : selectionComplete
                ? "Submit & finish assignment"
                : "Submit seats now"}
          </button>
        </div>
      </form>
    </div>
  );
}
