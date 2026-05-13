# MVP QA validation (core flows)

This document maps the Eventuz MVP to the validation checklist, notes what enforces each rule, and lists remaining product/ops gaps. Last reviewed with the audit hardening pass.

## Checklist results

| # | Case | Status | Enforcement / notes |
|---|------|--------|---------------------|
| 1 | Attendee cannot access organizer pages | **Pass** | `middleware.ts` requires `profiles.role` to match route prefix (`lib/auth/guards.ts`); mismatch redirects to `/`. |
| 2 | Staff cannot access organizer settings | **Pass** | Same as (1); staff role ≠ organizer. |
| 3 | Organizer cannot access other organizer events | **Pass** | Organizer event pages and APIs use `event.organizer_id === user.id` or `notFound()` / `forbidden` (e.g. `app/organizer/events/[eventId]/page.tsx`, `lib/organizer/loadEventDashboard.ts`, scan page). |
| 4 | Super Admin cannot edit event details | **Pass** | No app `events` update from super-admin UI; platform RPC only toggles registration block / user status. Organizers own content edits. |
| 5 | Cannot buy more tickets than available capacity | **Pass** | `availableTicketQuantityForType` + `placeHoldAction` cap quantity (`lib/orders/inventory.ts`, `app/attendee/event/actions.ts`). |
| 6 | Expired holds release capacity | **Pass** | `rowReservesCapacity` ignores expired `capacity_held` / `payment_pending`; global `expire_stale_unpaid_orders` + `runStaleOrderCleanup` / `expireOwnStaleOrders`. |
| 7 | Early bird price expires correctly | **Pass** | `resolveUnitPrice` + `computeEarlyBirdPriceLockExpiresAt` on hold; DB job reprices when `early_bird_price_expires_at` passes (`008` / `expire_stale_unpaid_orders`). |
| 8 | Payment redirect alone does not mark paid | **Pass** | Paid state only via HitPay webhook updating `payments` / `orders` (`lib/payments/processHitPayWebhook.ts`); attendee UI only shows a return hint. |
| 9 | Invalid webhook does not mark paid | **Pass** | HMAC verify with constant-time compare (`lib/payments/hitpayVerify.ts`); failures return before DB writes. |
| 10 | Duplicate webhook does not duplicate tickets/orders | **Pass** | Payment row updated idempotently; `issue_qr_tickets_for_order` returns early if non-voided tickets exist; order status guards on webhook. |
| 11 | Paid but unassigned orders display correctly | **Pass** | `loadAttendeeEventContext` surfaces `seatAssignmentOrders`; dashboard lists `paid_unassigned` / `partially_assigned`. |
| 12 | Unpaid orders cannot assign seats | **Pass** | `submit_order_seat_assignments` allows only `paid_unassigned` / `partially_assigned`; `loadSeatAssignmentPage` enforces the same. |
| 13 | Same seat cannot be assigned twice | **Pass** | Partial unique index on `seat_assignments(seat_id)` for active statuses (`010_seat_assignments.sql`); RPC checks availability. |
| 14 | QR ticket generated only after assignment | **Pass** | `issue_qr_tickets_for_order` requires `orders.status = completed` and assigned seat rows. |
| 15 | Ticket cannot be checked in twice as valid | **Pass** | `process_ticket_scan` returns `duplicate` when `tickets.status = checked_in`; DB updates only `issued` → `checked_in` once. |
| 16 | Disabled event blocks new purchases | **Pass** | `placeHoldAction` requires `events.status === 'published'`; **`startHitPayCheckoutAction`** now requires the same before starting or resuming HitPay; attendee hub uses `registrationOpen` to hide ticket types when the hub is only shown for post-purchase on a disabled event (`resolveAttendeeFacingEvent`). |
| 17 | SMTP failure does not delete tickets | **Pass** | `deliverTicketEmails` only updates `emailed_at` / `email_last_error`; issuance is separate (`lib/tickets/deliverTicketEmails.ts`). |

## Fixes applied in this QA pass

1. **Disabled event + existing buyers** — `resolveAttendeeFacingEvent` (`lib/event/attendeeEvent.ts`): after a published event disappears (e.g. status `disabled`), signed-in buyers with active/post-purchase orders can still load the event hub and seat/QR flows when the order matches configured slug rules. New sales stay blocked (`registrationOpen: false`, empty ticket types).
2. **HitPay checkout on suspended event** — `startHitPayCheckoutAction` now verifies `events.status === 'published'` before creating or resuming checkout.
3. **Dashboard revenue** — `loadOrganizerEventDashboard` counts **at most one succeeded payment amount per order** (latest succeeded by `created_at`) to avoid double-counting if multiple payment rows exist.
4. **UX** — Attendee event page shows a short “Registration closed” callout when the hub is open only for post-purchase on a non-published event.

## Known limitations (documented, not redesigned)

- **Multi-published-event deployment without `NEXT_PUBLIC_EVENT_PUBLIC_SLUG`** — `resolvePublishedEventForAttendee` still picks the earliest published event; buyers tied to a different event could see the wrong hub. MVP assumes a single public event or a fixed slug.
- **Payment in flight when event is disabled** — Checkout start is blocked; a webhook may still finalize a payment that started before disable. Ops should reconcile off-platform if needed.
- **Dashboard revenue currency** — Metrics sum numeric `payments.amount` without normalizing mixed currencies; fine when a single currency (e.g. PHP) is used.
- **Draft events** — Buyers with orders on `draft` events are not surfaced by `resolveAttendeeFacingEvent` fallback (only `published` / `disabled` in the fallback path).

## Local HitPay simulation (no gateway account)

For development, enable **Allow dev simulation** in **Super Admin → HitPay settings** (stored in the database). On the attendee event page, when an order is **`payment_pending`**, a **“Simulate payment succeeded”** control appears. It performs the same payment/order transitions as a successful webhook (RLS-safe buyer updates), writes a small `raw_webhook_payload` marker, and logs **`hitpay.dev_simulation`** in audit logs. **Never enable in production.**


1. Sign in as attendee → confirm `/organizer` redirects away.
2. Sign in as staff → confirm `/organizer` redirects away.
3. Organizer A opens Organizer B event URL → `404`.
4. Super Admin → no event edit forms; only suspend user/event controls.
5. Hold + release inventory: two browsers near capacity; expire hold (wait or RPC); second user can hold.
6. HitPay: invalid body/signature → order stays unpaid; duplicate success webhook → no extra tickets.
7. Pay → `paid_unassigned` on hub and dashboard → assign seats → issue tickets → scan twice → second is duplicate.
8. Disable event (organizer or super admin): new hold blocked; existing buyer still sees tickets/seats when applicable; checkout blocked.
