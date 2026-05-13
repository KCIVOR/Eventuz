"use client";

import { submitSeatAssignments, type SeatAssignmentRow } from "@/app/attendee/event/seats/actions";
import type {
  AssignableOrder,
  ExistingAssignment,
  SeatPickerRow,
} from "@/lib/attendee/loadSeatAssignmentPage";
import { formatPhp } from "@/lib/utils/money";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition, type FormEvent } from "react";

type Props = {
  eventName: string;
  order: AssignableOrder;
  ticketTypeName: string;
  seatLayoutMode: "rowed" | "tables";
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
  seatLayoutMode,
  seats,
  initialAssignments,
  seatInventoryTotal,
}: Props) {
  const qty = order.quantity;
  const initialIds = useMemo(
    () => initialAssignments.map((a) => a.seat_id),
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

  const seatsByGroup = useMemo(() => {
    const map = new Map<string, SeatPickerRow[]>();
    for (const s of seats) {
      const key = (s.table_label ?? "").trim() || "Ungrouped";
      const list = map.get(key) ?? [];
      list.push(s);
      map.set(key, list);
    }
    return [...map.entries()]
      .sort(([a], [b]) => a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" }))
      .map(([label, groupSeats]) => ({
        label,
        seats: [...groupSeats].sort((a, b) =>
          a.display_label.localeCompare(b.display_label, undefined, { numeric: true })
        ),
      }));
  }, [seats]);

  function seatButton(s: SeatPickerRow) {
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
          "flex aspect-square min-h-10 min-w-10 cursor-pointer items-center justify-center rounded-md border px-2 text-xs font-semibold transition-colors duration-200 motion-reduce:transition-none",
          "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
          selected
            ? "border-primary bg-primary text-primary-foreground"
            : "border-border bg-background text-foreground hover:border-primary/50 hover:bg-muted/40",
          atCapacity ? "cursor-not-allowed opacity-45 hover:border-border hover:bg-background" : "",
          pending ? "opacity-60" : "",
        ].join(" ")}
        title={s.display_label}
      >
        {seatLayoutMode === "tables" ? s.seat_label || s.display_label : s.display_label}
      </button>
    );
  }

  return (
    <div className="space-y-10">
      <header className="space-y-3 rounded-2xl border border-border bg-card px-8 py-10 text-center shadow-sm">
        <div className="flex items-center justify-center gap-3 mb-2">
          <span className="h-[1px] w-8 bg-accent-gold/30" />
          <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-accent-gold">
            Seating Plan
          </p>
          <span className="h-[1px] w-8 bg-accent-gold/30" />
        </div>
        <h1 className="font-serif text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
          {eventName}
        </h1>
        <p className="mx-auto max-w-2xl text-sm font-light leading-relaxed text-muted-foreground">
          Choose your preferred location. Once selected, provide the attendee details for each seat to finalize your reservation.
        </p>
      </header>

      <div className="lg:grid lg:grid-cols-12 lg:gap-10 lg:items-start">
        
        {/* MAIN: Seating Map & Forms */}
        <div className="lg:col-span-7 space-y-8">
          <section
            className="rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-8"
            aria-labelledby="available-seats-heading"
          >
            <div className="flex items-center justify-between mb-6">
              <h2 id="available-seats-heading" className="font-serif text-xl font-light text-foreground">
                Available Seats
              </h2>
              <div className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rotate-45 bg-accent-gold" />
                <span className="text-[10px] uppercase tracking-widest text-accent-gold font-semibold">Tier: {ticketTypeName}</span>
              </div>
            </div>

            <div className="space-y-6" role="group" aria-label="Seat selection">
              {seatInventoryTotal === 0 ? (
                <div className="rounded-xl border border-dashed border-border bg-muted/5 py-16 text-center">
                  <p className="text-sm italic text-muted-foreground">
                    No seating layout defined for this package.
                  </p>
                </div>
              ) : (
                <div
                  className={
                    seatLayoutMode === "tables"
                      ? "grid gap-4 sm:grid-cols-2"
                      : "space-y-4"
                  }
                >
                  {seatsByGroup.map((group) =>
                    seatLayoutMode === "tables" ? (
                      <section
                        key={group.label}
                        className="rounded-xl border border-border/60 bg-background p-5"
                        aria-label={group.label}
                      >
                        <div className="mb-6 flex items-center justify-center">
                          <div className="flex h-16 w-16 items-center justify-center rounded-full border border-accent-gold/20 bg-card text-center text-xs font-semibold text-foreground">
                            {group.label}
                          </div>
                        </div>
                        <div className="grid grid-cols-4 gap-2.5">
                          {group.seats.map((s) => seatButton(s))}
                        </div>
                      </section>
                    ) : (
                      <section
                        key={group.label}
                        className="rounded-xl border border-border/60 bg-background p-4"
                        aria-label={group.label}
                      >
                        <div className="grid grid-cols-[4rem_1fr] items-center gap-4">
                          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60">
                            {group.label}
                          </p>
                          <div
                            className="grid gap-2"
                            style={{
                              gridTemplateColumns: `repeat(${group.seats.length}, minmax(2.5rem, 1fr))`,
                            }}
                          >
                            {group.seats.map((s) => seatButton(s))}
                          </div>
                        </div>
                      </section>
                    )
                  )}
                </div>
              )}
            </div>
          </section>

          {selectedSeatIds.length > 0 && (
            <section className="animate-fade-in-up space-y-6" aria-labelledby="attendee-details-heading">
              <div className="flex items-center gap-4">
                <h2 id="attendee-details-heading" className="font-serif text-xl font-light text-foreground">
                  Attendee Details
                </h2>
                <span className="h-[1px] flex-1 bg-gradient-to-r from-border to-transparent" />
              </div>

              <ul className="space-y-4">
                {sortedSelected.map((seatId) => {
                  const label = labelById.get(seatId) ?? seatId;
                  const det = detailsBySeat[seatId] ?? { name: "", email: "" };
                  const idBase = `seat-${seatId}`;
                  return (
                    <li
                      key={seatId}
                      className="panel-card p-6"
                    >
                      <div className="flex items-center justify-between mb-4">
                        <span className="text-[10px] font-semibold uppercase tracking-widest text-accent-gold">
                          Seat {label}
                        </span>
                        <div className="h-1 w-1 rotate-45 bg-accent-gold/40" />
                      </div>
                      <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-1.5">
                          <label htmlFor={`${idBase}-name`} className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">
                            Full name
                          </label>
                          <input
                            id={`${idBase}-name`}
                            className="w-full rounded-lg border border-border bg-card px-4 py-2.5 text-sm text-foreground transition-all focus:border-accent-gold focus:ring-1 focus:ring-accent-gold/20"
                            autoComplete="name"
                            placeholder="John Doe"
                            value={det.name}
                            onChange={(ev) => setDetail(seatId, "name", ev.target.value)}
                            disabled={pending}
                            required
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label htmlFor={`${idBase}-email`} className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">
                            Email address
                          </label>
                          <input
                            id={`${idBase}-email`}
                            type="email"
                            className="w-full rounded-lg border border-border bg-card px-4 py-2.5 text-sm text-foreground transition-all focus:border-accent-gold focus:ring-1 focus:ring-accent-gold/20"
                            autoComplete="email"
                            placeholder="john@example.com"
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
            </section>
          )}
        </div>

        {/* SIDEBAR: Summary & Actions */}
        <aside className="lg:col-span-5 space-y-6 lg:sticky lg:top-32">
          
          <div className="panel-card p-0 overflow-hidden shadow-lg shadow-accent-gold/[0.03]">
            <div className="bg-accent-gold/[0.03] p-8 border-b border-accent-gold/10">
              <h2 className="font-serif text-2xl font-light text-foreground mb-1">Your Selection</h2>
              <p className="text-[10px] uppercase tracking-widest text-accent-gold font-semibold">Order Summary</p>
            </div>

            <div className="p-8 space-y-6">
              <dl className="space-y-4">
                <div className="flex justify-between items-center text-sm">
                  <dt className="text-muted-foreground font-light">Ticket Tier</dt>
                  <dd className="font-medium text-foreground">{ticketTypeName}</dd>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <dt className="text-muted-foreground font-light">Quantity Reserved</dt>
                  <dd className="font-medium text-foreground">{qty} Seats</dd>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <dt className="text-muted-foreground font-light">Total Paid</dt>
                  <dd className="font-serif text-lg text-foreground">{phpTotal}</dd>
                </div>
              </dl>

              <div className="pt-6 border-t border-border/60">
                <div className="flex items-center justify-between mb-4">
                   <span className="text-xs font-medium text-foreground">Selection Progress</span>
                   <span className="text-xs text-muted-foreground">{selectedSeatIds.length} / {qty}</span>
                </div>
                <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-accent-gold transition-all duration-500 ease-out" 
                    style={{ width: `${(selectedSeatIds.length / qty) * 100}%` }}
                  />
                </div>
              </div>

              {/* Status Messages */}
              {error && (
                <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-4 text-xs text-destructive animate-in fade-in slide-in-from-top-1" role="alert">
                  <p className="font-semibold mb-1">Action Required</p>
                  <p className="opacity-80 leading-relaxed">{error}</p>
                </div>
              )}

              {success && (
                <div className="rounded-xl border border-success/20 bg-success/5 p-4 text-xs text-success animate-in fade-in slide-in-from-top-1" role="status">
                  <p className="font-semibold mb-1">Success</p>
                  <p className="opacity-80 leading-relaxed">{success}</p>
                </div>
              )}

              <form onSubmit={onSubmit}>
                <button
                  type="submit"
                  disabled={pending || !canSubmit || seats.length === 0 || seatInventoryTotal === 0}
                  className="btn-eventuz-gold w-full py-4 shadow-lg shadow-accent-gold/10 text-sm disabled:opacity-40 disabled:shadow-none"
                >
                  {pending
                    ? "Confirming Selection..."
                    : selectionComplete
                      ? "Submit & Finish Assignment"
                      : `Assign ${selectedSeatIds.length} of ${qty} Seats`}
                </button>
              </form>
            </div>

            <div className="bg-muted/30 p-6 border-t border-border/50 text-center">
              <p className="text-[10px] text-muted-foreground font-light leading-relaxed">
                Tickets are issued only after all seats in this order are assigned. You can manage them later in your profile.
              </p>
            </div>
          </div>
        </aside>

      </div>
    </div>
  );
}
