# Attendee Event Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Repurpose `/attendee/event` from a duplicate event landing page into a private attendee dashboard that shows the attendee's current event status and next best action.

**Architecture:** Keep `/` as the public event and checkout entry point. Keep `/attendee/event/seats`, `/attendee/event/tickets`, and `/attendee/transactions` as the detailed task pages. Make `/attendee/event` a lightweight dashboard that reuses `loadAttendeeEventContext()`, `loadAttendeeTransactions()`, `PaymentStatusPoller`, and existing action routes instead of duplicating checkout, ticket, seat, or transaction functionality.

**Tech Stack:** Next.js 16 App Router, React Server Components by default, TypeScript, Tailwind v4 utility CSS in `app/globals.css`, Supabase loaders/actions, existing Eventuz role shell/navigation.

---

## Audit

### Current Route Ownership

- `/` already owns the public event experience: event hero, countdown, about/story, venue/map, ticket teaser, and `LandingCheckoutModal`.
- `/attendee/event` currently duplicates the event experience: event image, description, venue/map, countdown, checkout form, payment return polling, seat/ticket links.
- `/attendee/event/seats` already owns seat assignment states and the `SeatAssignmentForm`.
- `/attendee/event/tickets` already owns the passbook/detail flow through `AttendeeTicketOverview`.
- `/attendee/transactions` already owns transaction history and filtering through `AttendeeTransactionHistory`.
- `components/attendee/PaymentStatusPoller.tsx` already owns polling an active HitPay return and navigating to `/attendee/event/seats`.
- `components/layout/navigation.ts` already labels `/attendee/event` as `Dashboard`, so navigation intent is already aligned.

### Duplication To Remove From `/attendee/event`

- Public event narrative: image, title, description, venue/map should stay only on `/`.
- Ticket purchase UI: `CapacityHoldForm` should stay inside the landing checkout modal, not the private dashboard.
- Full passbook list: keep on `/attendee/event/tickets`; dashboard should summarize and link.
- Full seat assignment form/order picker: keep on `/attendee/event/seats`; dashboard should summarize and link.
- Full transaction table: keep on `/attendee/transactions`; dashboard should show only latest activity or a link.

### Dashboard Responsibilities

- Show a compact event context header: event name, date/time, venue, and link to public event page.
- Show a primary next-action card based on state:
  - `activeOrder.status === "payment_pending"`: continue payment and show `PaymentStatusPoller` only when returning from HitPay.
  - `activeOrder.status === "capacity_held"`: continue reservation on `/?checkout=1`.
  - `seatAssignmentOrders.length > 0`: choose/continue seats.
  - `ordersNeedingQrIssue.length > 0`: go to tickets to generate/issue passes.
  - `qrTickets.length > 0`: view digital passes.
  - no attendee activity: reserve tickets on the landing page.
- Show summary cards, not duplicated workflows: open reservation, seats to assign, digital passes, recent transaction count/last status.
- Keep all detailed CTA targets on existing pages.

---

## File Structure

- Modify `app/attendee/event/page.tsx`: replace duplicate landing-page content with dashboard data loading and dashboard component rendering.
- Create `components/attendee/AttendeeEventDashboard.tsx`: presentational dashboard component only; no database calls.
- Modify `components/attendee/PaymentStatusPoller.tsx`: accept `redirectTo?: string` and default to `/attendee/event/seats` so the dashboard can keep existing behavior without hard-coding a new component.
- Reuse `lib/attendee/eventContext.ts`: no new seat/ticket queries.
- Reuse `lib/attendee/transactions.ts`: load page 1 with no filter for a compact recent transaction summary.
- Modify `components/layout/navigation.ts`: keep `Dashboard` and add `Transactions` to attendee navigation for discoverability.
- Do not modify `app/page.tsx`, `components/attendee/LandingCheckoutModal.tsx`, `components/attendee/CapacityHoldForm.tsx`, `app/attendee/event/seats/page.tsx`, or `app/attendee/event/tickets/page.tsx` for duplicated dashboard behavior.

---

### Task 1: Add Configurable Payment Poll Redirect

**Files:**
- Modify: `components/attendee/PaymentStatusPoller.tsx`

- [ ] **Step 1: Update props and default redirect target**

Replace the props type and component signature with:

```tsx
type Props = {
  orderId: string;
  redirectTo?: string;
};

export function PaymentStatusPoller({ orderId, redirectTo = "/attendee/event/seats" }: Props) {
```

- [ ] **Step 2: Use the prop when payment succeeds**

Replace:

```tsx
router.push("/attendee/event/seats");
```

with:

```tsx
router.push(redirectTo);
```

- [ ] **Step 3: Update the effect dependency list**

Replace:

```tsx
}, [orderId, isDone, router]);
```

with:

```tsx
}, [orderId, isDone, redirectTo, router]);
```

- [ ] **Step 4: Run a focused static check**

Run:

```bash
npm run build
```

Expected: build may require network access for Google Fonts. With network access, build reaches route generation with no TypeScript error from `PaymentStatusPoller`.

---

### Task 2: Create the Attendee Dashboard Component

**Files:**
- Create: `components/attendee/AttendeeEventDashboard.tsx`

- [ ] **Step 1: Create the dashboard component**

Create `components/attendee/AttendeeEventDashboard.tsx`:

```tsx
import Link from "next/link";
import { PaymentStatusPoller } from "@/components/attendee/PaymentStatusPoller";
import type {
  PaidOrderSummary,
  QrTicketListRow,
  SeatAssignmentOrderLink,
} from "@/lib/attendee/eventContext";
import type { TransactionRow } from "@/lib/attendee/transactions";

type EventSummary = {
  id: string;
  name: string;
  venue: string;
  eventDate: string;
  eventTime: string;
};

type Props = {
  event: EventSummary;
  fromHitPay: boolean;
  activeOrder: Record<string, unknown> | null;
  resumeCheckoutUrl: string | null;
  seatAssignmentOrders: SeatAssignmentOrderLink[];
  ordersNeedingQrIssue: PaidOrderSummary[];
  qrTickets: QrTicketListRow[];
  recentTransactions: TransactionRow[];
  transactionTotal: number;
};

function formatDate(date: string, time: string) {
  const displayDate = date
    ? new Intl.DateTimeFormat("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
      }).format(new Date(date))
    : "Date to be announced";

  return time ? `${displayDate} · ${time}` : displayDate;
}

function statusLabel(status: string) {
  const labels: Record<string, string> = {
    capacity_held: "Reservation held",
    payment_pending: "Payment pending",
    paid_unassigned: "Seats needed",
    partially_assigned: "Seats in progress",
    completed: "Completed",
    payment_failed: "Payment failed",
    expired: "Expired",
    cancelled: "Cancelled",
  };

  return labels[status] ?? status.replaceAll("_", " ");
}

export function AttendeeEventDashboard({
  event,
  fromHitPay,
  activeOrder,
  resumeCheckoutUrl,
  seatAssignmentOrders,
  ordersNeedingQrIssue,
  qrTickets,
  recentTransactions,
  transactionTotal,
}: Props) {
  const paymentPending = activeOrder?.status === "payment_pending";
  const capacityHeld = activeOrder?.status === "capacity_held";
  const seatsToAssign = seatAssignmentOrders.reduce(
    (sum, order) => sum + Math.max(0, Number(order.quantity) - Number(order.assignedCount)),
    0
  );
  const checkedInCount = qrTickets.filter((ticket) => ticket.status === "checked_in").length;
  const firstSeatOrder = seatAssignmentOrders[0];
  const latestTransaction = recentTransactions[0];

  let actionTitle = "Reserve your tickets";
  let actionBody = "Start from the public event page to select a ticket package and begin checkout.";
  let actionHref = "/?checkout=1";
  let actionLabel = "Reserve tickets";
  let actionExternal = false;

  if (paymentPending) {
    actionTitle = "Complete your payment";
    actionBody = fromHitPay
      ? "We are checking for the HitPay confirmation. This usually updates in a few moments."
      : "Your reservation is waiting for payment. Continue checkout before the payment window expires.";
    actionHref = resumeCheckoutUrl ?? "/?checkout=1";
    actionLabel = resumeCheckoutUrl ? "Continue to payment" : "Review reservation";
    actionExternal = Boolean(resumeCheckoutUrl);
  } else if (capacityHeld) {
    actionTitle = "Finish your reservation";
    actionBody = "Your ticket selection is being held temporarily. Continue checkout to secure it.";
    actionHref = "/?checkout=1";
    actionLabel = "Continue reservation";
  } else if (seatAssignmentOrders.length > 0) {
    actionTitle = "Assign guest details";
    actionBody = "Payment is confirmed. Choose seats and enter guest details to unlock digital passes.";
    actionHref = firstSeatOrder
      ? `/attendee/event/seats?order=${encodeURIComponent(firstSeatOrder.id)}`
      : "/attendee/event/seats";
    actionLabel = "Choose seats";
  } else if (ordersNeedingQrIssue.length > 0) {
    actionTitle = "Generate your passes";
    actionBody = "Guest details are complete. Issue digital passes from your ticket wallet.";
    actionHref = "/attendee/event/tickets";
    actionLabel = "Open tickets";
  } else if (qrTickets.length > 0) {
    actionTitle = "Your passes are ready";
    actionBody = "Keep your QR passes available for check-in and share each guest pass as needed.";
    actionHref = "/attendee/event/tickets";
    actionLabel = "View digital passes";
  }

  return (
    <div className="mx-auto w-full max-w-7xl px-4 pb-12 lg:px-8">
      <div className="mb-10 grid gap-6 lg:grid-cols-[1fr_360px] lg:items-end">
        <header className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="h-1.5 w-1.5 rotate-45 bg-accent-gold" />
            <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-accent-gold">
              Attendee Dashboard
            </p>
          </div>
          <div>
            <h1 className="font-serif text-4xl font-light tracking-tight text-foreground sm:text-5xl">
              My Event
            </h1>
            <p className="mt-3 max-w-2xl text-sm font-light leading-relaxed text-muted-foreground">
              Manage your reservation, seats, digital passes, and payment history for {event.name}.
            </p>
          </div>
        </header>

        <Link href="/" className="btn-eventuz-secondary justify-center px-6 py-3 text-xs">
          View public event page
        </Link>
      </div>

      <div className="grid gap-8 lg:grid-cols-12 lg:items-start">
        <main className="space-y-8 lg:col-span-7">
          <section className="panel-card overflow-hidden p-0">
            <div className="border-b border-border/50 bg-accent-gold/[0.03] px-8 py-5">
              <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-accent-gold">
                Next step
              </p>
            </div>
            <div className="space-y-6 p-8">
              <div>
                <h2 className="font-serif text-3xl font-light text-foreground">{actionTitle}</h2>
                <p className="mt-3 text-sm font-light leading-relaxed text-muted-foreground">{actionBody}</p>
              </div>

              {fromHitPay && paymentPending && activeOrder?.id ? (
                <div className="rounded-sm border border-primary/20 bg-muted/30 px-5 py-4">
                  <PaymentStatusPoller
                    orderId={activeOrder.id as string}
                    redirectTo="/attendee/event/seats"
                  />
                </div>
              ) : null}

              {actionExternal ? (
                <a
                  href={actionHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-eventuz-gold px-8 py-4 text-sm"
                >
                  {actionLabel}
                </a>
              ) : (
                <Link href={actionHref} className="btn-eventuz-gold px-8 py-4 text-sm">
                  {actionLabel}
                </Link>
              )}
            </div>
          </section>

          <section className="grid gap-4 sm:grid-cols-2">
            <DashboardMetric label="Seats remaining" value={seatsToAssign} href="/attendee/event/seats" />
            <DashboardMetric label="Digital passes" value={qrTickets.length} href="/attendee/event/tickets" />
            <DashboardMetric label="Checked in" value={checkedInCount} href="/attendee/event/tickets" />
            <DashboardMetric label="Transactions" value={transactionTotal} href="/attendee/transactions" />
          </section>
        </main>

        <aside className="space-y-6 lg:col-span-5 lg:sticky lg:top-32">
          <section className="panel-card p-8">
            <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-accent-gold">
              Event details
            </p>
            <h2 className="mt-3 font-serif text-2xl font-light text-foreground">{event.name}</h2>
            <dl className="mt-6 space-y-4 text-sm">
              <div>
                <dt className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  Date
                </dt>
                <dd className="mt-1 text-foreground">{formatDate(event.eventDate, event.eventTime)}</dd>
              </div>
              <div>
                <dt className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  Venue
                </dt>
                <dd className="mt-1 text-foreground">{event.venue}</dd>
              </div>
            </dl>
          </section>

          <section className="panel-card p-8">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-accent-gold">
                  Recent activity
                </p>
                <h2 className="mt-2 font-serif text-2xl font-light text-foreground">Transactions</h2>
              </div>
              <Link href="/attendee/transactions" className="text-[10px] font-semibold uppercase tracking-widest text-accent-gold">
                View all
              </Link>
            </div>
            {latestTransaction ? (
              <div className="mt-6 rounded-sm border border-border bg-muted/10 p-5">
                <p className="text-sm font-medium text-foreground">{latestTransaction.ticket_type_name}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {statusLabel(latestTransaction.status)} · {new Date(latestTransaction.created_at).toLocaleDateString()}
                </p>
              </div>
            ) : (
              <p className="mt-6 text-sm font-light leading-relaxed text-muted-foreground">
                No transactions yet. Your reservation activity will appear here after checkout starts.
              </p>
            )}
          </section>
        </aside>
      </div>
    </div>
  );
}

function DashboardMetric({
  label,
  value,
  href,
}: {
  label: string;
  value: number;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="panel-card p-6 transition-all hover:border-accent-gold/40 hover:shadow-md"
    >
      <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">{label}</p>
      <p className="mt-3 font-serif text-4xl font-light leading-none text-foreground">{value}</p>
    </Link>
  );
}
```

- [ ] **Step 2: Run TypeScript/build check**

Run:

```bash
npm run build
```

Expected: if Google Fonts can be fetched, build reaches route generation. If it fails only on Google Fonts, rerun with network access and confirm no component/type errors.

---

### Task 3: Replace `/attendee/event` With Dashboard Composition

**Files:**
- Modify: `app/attendee/event/page.tsx`

- [ ] **Step 1: Replace duplicate event-page imports**

Remove:

```tsx
import { CapacityHoldForm } from "@/components/attendee/CapacityHoldForm";
import { PaymentStatusPoller } from "@/components/attendee/PaymentStatusPoller";
import { isHitPayDevSimulationAllowed } from "@/lib/payments/hitpayDevSimulation";
import { EventMapPreview } from "@/components/ui/EventMapPreview";
import { EventCountdown } from "@/components/attendee/EventCountdown";
import { loadActiveGoogleMapsApiKey } from "@/lib/super-admin/loadGoogleMapsSettings";
import Link from "next/link";
```

Add:

```tsx
import { AttendeeEventDashboard } from "@/components/attendee/AttendeeEventDashboard";
import { loadAttendeeTransactions } from "@/lib/attendee/transactions";
```

- [ ] **Step 2: Update metadata title**

Replace:

```tsx
title: "Your invitation · Eventuz",
```

with:

```tsx
title: "My Event · Eventuz",
```

- [ ] **Step 3: Keep the existing search param handling**

Keep:

```tsx
const q = await searchParams;
const fromHitPay = q.hitpay_return === "1";
```

Remove unused `seatsDone`, `ticketsOk`, and `ticketErr` handling from this page. Those result messages belong on the detailed pages or dashboard action state, not the public event duplicate.

- [ ] **Step 4: Load event context and recent transactions**

After `loadAttendeeEventContext()`, add:

```tsx
const { transactions: recentTransactions, total: transactionTotal } = await loadAttendeeTransactions({
  search: "",
  status: "",
  page: 1,
});
```

- [ ] **Step 5: Render the dashboard**

Replace the large `RoleAreaShell` body with:

```tsx
const name = event.name as string;
const venue = (event.venue as string) || "Venue to be announced";
const eventDate = (event.event_date as string) || "";
const eventTime = String(event.event_time ?? "").slice(0, 5);

return (
  <RoleAreaShell
    role="attendee"
    title="My Event"
    showPageHeader={false}
    compactTitle="My Event"
    layout="flush"
    mainWidth="wide"
  >
    <AttendeeEventDashboard
      event={{
        id: event.id as string,
        name,
        venue,
        eventDate,
        eventTime,
      }}
      fromHitPay={fromHitPay}
      activeOrder={activeOrder}
      resumeCheckoutUrl={resumeCheckoutUrl}
      seatAssignmentOrders={seatAssignmentOrders}
      ordersNeedingQrIssue={ordersNeedingQrIssue}
      qrTickets={qrTickets}
      recentTransactions={recentTransactions}
      transactionTotal={transactionTotal}
    />
  </RoleAreaShell>
);
```

- [ ] **Step 6: Verify no duplicate workflow imports remain**

Run:

```bash
rg "CapacityHoldForm|EventMapPreview|EventCountdown|loadActiveGoogleMapsApiKey|isHitPayDevSimulationAllowed" app/attendee/event/page.tsx
```

Expected: no matches.

---

### Task 4: Keep Detailed Pages As Source Of Truth

**Files:**
- Modify: `app/attendee/event/seats/page.tsx`
- Modify: `app/attendee/event/tickets/page.tsx`
- Modify: `components/attendee/AttendeeTicketOverview.tsx`

- [ ] **Step 1: Rename breadcrumbs from invitation to dashboard**

In `app/attendee/event/seats/page.tsx`, replace every breadcrumb label:

```tsx
{ label: "Your invitation", href: "/attendee/event" },
```

with:

```tsx
{ label: "My Event", href: "/attendee/event" },
```

In `app/attendee/event/tickets/page.tsx`, replace:

```tsx
{ label: "Your invitation", href: "/attendee/event" },
```

with:

```tsx
{ label: "My Event", href: "/attendee/event" },
```

- [ ] **Step 2: Update links that point to the old invitation concept**

In `components/attendee/AttendeeTicketOverview.tsx`, replace:

```tsx
Review Order Details
Go to Invitation
Return to Invitation
```

with:

```tsx
Review dashboard
Go to dashboard
Return to dashboard
```

Keep the target hrefs as `/attendee/event`.

- [ ] **Step 3: Update locked seat page copy**

In `app/attendee/event/seats/page.tsx`, replace:

```tsx
View invitation &amp; tickets
Your invitation
Back to your invitation
```

with:

```tsx
View dashboard &amp; tickets
My Event
Back to dashboard
```

Keep the target hrefs as `/attendee/event`.

- [ ] **Step 4: Verify no stale invitation labels in attendee private pages**

Run:

```bash
rg "invitation|Invitation" app/attendee components/attendee
```

Expected: only intentional public/invite contexts remain. There should be no private-dashboard navigation label that calls `/attendee/event` an invitation.

---

### Task 5: Make Attendee Navigation Match The New IA

**Files:**
- Modify: `components/layout/navigation.ts`

- [ ] **Step 1: Add transaction history to attendee nav**

Replace the attendee nav items:

```ts
{ id: "invite", label: "Dashboard", href: "/attendee/event" },
{ id: "seats", label: "Choose seats", href: "/attendee/event/seats" },
{ id: "tickets", label: "Your tickets", href: "/attendee/event/tickets" },
```

with:

```ts
{ id: "dashboard", label: "Dashboard", href: "/attendee/event" },
{ id: "seats", label: "Choose seats", href: "/attendee/event/seats" },
{ id: "tickets", label: "Your tickets", href: "/attendee/event/tickets" },
{ id: "transactions", label: "Transactions", href: "/attendee/transactions" },
```

- [ ] **Step 2: Verify attendee home remains dashboard**

Run:

```bash
rg "roleHomeHref|/attendee/event" components/layout/navigation.ts app/attendee/page.tsx
```

Expected: attendee home and `/attendee` redirect both still point to `/attendee/event`.

---

### Task 6: Verify Build And UX Paths

**Files:**
- No code changes.

- [ ] **Step 1: Run lint**

Run:

```bash
npm run lint
```

Expected: no new lint errors from dashboard files. Existing unrelated warnings should be documented if present.

- [ ] **Step 2: Run build**

Run:

```bash
npm run build
```

Expected: build exits `0` when Google Fonts are reachable. If local sandbox blocks Google Fonts, rerun with network access and record that the sandbox-only failure was `next/font/google`.

- [ ] **Step 3: Manual route smoke test**

Start the app:

```bash
npm run dev
```

Visit these routes as an attendee:

```text
/
/attendee/event
/attendee/event/seats
/attendee/event/tickets
/attendee/transactions
```

Expected:
- `/` remains the public event and checkout entry page.
- `/attendee/event` shows dashboard, not the event story/venue/checkout form.
- `/attendee/event/seats` still owns seat assignment.
- `/attendee/event/tickets` still owns passbook and QR actions.
- `/attendee/transactions` still owns the full transaction table.

- [ ] **Step 4: HitPay return smoke test**

With an order in `payment_pending`, visit:

```text
/attendee/event?hitpay_return=1
```

Expected:
- Dashboard shows the payment confirmation/polling state.
- `PaymentStatusPoller` navigates to `/attendee/event/seats` after `checkOrderStatusAction()` returns `isPaid: true`.
- If the order is already `paid_unassigned`, dashboard shows the seat assignment CTA immediately.

---

## Self-Review

- Spec coverage: the plan removes duplicated public-event content from `/attendee/event`, preserves existing detailed pages, keeps checkout on `/`, and makes `/attendee/event` the private dashboard.
- Placeholder scan: no placeholder markers or vague implementation-only steps remain.
- Type consistency: dashboard props use existing `SeatAssignmentOrderLink`, `PaidOrderSummary`, `QrTicketListRow`, and `TransactionRow` types.
- Duplication check: detailed ticket, seat, transaction, and checkout functionality stays in existing components/routes. The new dashboard only summarizes and links.
