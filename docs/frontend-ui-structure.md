# Eventuz frontend UI/UX structure

This document inventories **every user-facing route** in the App Router (`app/`), the **layout shells** and **shared chrome**, and notable **components** (navigation, forms, scanners). It reflects the codebase as of the MVP foundation.

---

## 1. Global stack

| Layer | Implementation |
|--------|----------------|
| Framework | Next.js App Router (`app/`) |
| Styling | Tailwind CSS v4 (`@import "tailwindcss"` in `app/globals.css`) |
| Typography | **Inter** (body / `--font-inter`), **Cormorant Garamond** (display / `--font-serif`) via `next/font` in `app/layout.tsx` |
| Design tokens | CSS variables in `app/globals.css` (background, primary burgundy, accent gold, success, destructive, warning); aligned with `docs/eventuz-design-guide.md` |
| Root layout | `app/layout.tsx`: `<html>` + `<body className="min-h-full flex flex-col …">` only wraps **`{children}`** — no global header here |
| Custom 404 | No `app/not-found.tsx`; Next.js default applies when `notFound()` is thrown |

---

## 2. Layout shells (no app-wide sidebar)

The product uses **horizontal top navigation** via **`SiteHeader`**, not a persistent sidebar. Role areas add a **role chip + page title** row inside the main column.

| Shell | File | Top chrome | Main content width | Footer |
|--------|------|------------|--------------------|--------|
| **PublicShell** | `components/layout/PublicShell.tsx` | `SiteHeader` | `max-w-5xl` | `SiteFooter` |
| **AuthShell** | `components/layout/AuthShell.tsx` | Thin bar: “← Eventuz” link only (not full `SiteHeader`) | Centered card `max-w-sm` | `SiteFooter` |
| **RoleAreaShell** | `components/layout/RoleAreaShell.tsx` | `SiteHeader` | `max-w-5xl` or **`wide` → `max-w-7xl`** | `SiteFooter` |
| | | | Optional **dashed panel** wrapper (`layout="panel"`, default) vs **flush** (`layout="flush"`) | |

### 2.1 Site header (global nav bar)

**`components/layout/SiteHeader.tsx`**

- **Left:** Wordmark link “Eventuz” → `/`
- **Right:** Inline text links (wrap on small screens): Home, Log in, Register, Organizer, Attendee, Staff, Super Admin
- **Visual:** `border-b`, `backdrop-blur`, `bg-card/90`, fixed content height ~`h-14`
- **Not present:** hamburger menu, dropdowns, user avatar menu, notifications

### 2.2 Site footer

**`components/layout/SiteFooter.tsx`**

- Single line centered: tagline + “MVP foundation”
- Class `no-print` (hidden when printing tickets)

---

## 3. Modals, dialogs, and overlays

**There are no dedicated modal/dialog libraries** (no Radix Dialog, Headless UI, `dialog` sheet components) in the repo.

| Pattern | Where |
|---------|--------|
| **Inline alerts / banners** | Colored bordered boxes (`border-destructive`, `border-success`, `border-warning`, etc.) on many pages |
| **Scanner UI** | `html5-qrcode` renders into a **DOM container** (`EventCheckInScanner`); scan **result** is **in-page state** (not a modal) |
| **Forms** | Standard `<form>` + server actions / client submit; **no** multi-step wizard modals |

Print behavior: ticket pass page uses **`no-print`** on nav and buttons; print CSS in `globals.css`.

---

## 4. Shared UI components (by area)

| Area | Path | Role |
|------|------|------|
| Auth | `components/auth/LoginForm.tsx`, `RegisterForm.tsx` | Email/password; login uses client Supabase + redirect by role |
| Attendee | `CapacityHoldForm.tsx`, `SeatAssignmentForm.tsx`, `QrTicketsBlock.tsx`, `TicketPrintButton.tsx` | Holds, HitPay/simulation, seat picker, QR list, print trigger |
| Organizer | `components/organizer/eventSetupStyles.ts` | Shared class strings for panels, buttons, fields, callouts |
| Check-in | `components/check-in/EventCheckInScanner.tsx` | Camera QR + manual code + result panel |
| Super Admin | `PlatformMetricGrid.tsx`, `SmtpSettingsForm.tsx`, `AdminStatusChip.tsx` | Metrics grid, SMTP form, table chips |
| Generic | `components/ui/PlaceholderNotice.tsx` | Dashed “placeholder” callout on marketing/staff home |

---

## 5. Page-by-page inventory

Routes are listed by URL pattern. **Shell** = which layout wrapper the page uses.

### 5.1 Marketing & auth

| Route | File | Shell | Structure / UX |
|-------|------|-------|----------------|
| **`/`** | `app/page.tsx` | PublicShell | Centered hero: gold kicker, “Eventuz” serif title, short description, `PlaceholderNotice` |
| **`/login`** | `app/login/page.tsx` | AuthShell (`title="Log in"`) | `Suspense` + client `LoginForm` (email, password, messages, role-safe redirect) |
| **`/register`** | `app/register/page.tsx` | AuthShell (`title="Create account"`) | `RegisterForm` + footnote on default **attendee** role |

### 5.2 Attendee (registration funnel)

| Route | File | Shell | Structure / UX |
|-------|------|-------|----------------|
| **`/attendee`** | `app/attendee/page.tsx` | *(none — immediate redirect)* | `redirect("/attendee/event")` |
| **`/attendee/event`** | `app/attendee/event/page.tsx` | RoleAreaShell (**attendee**, title = event name) | **Narrow column** `max-w-lg`: event invite **card** (gold kicker, date/venue), optional description, registration-closed banner, query-driven banners (HitPay return, seats done, tickets OK/error), **`QrTicketsBlock`**, “Assign your seats” section with CTA links, **Tickets** section with **`CapacityHoldForm`** or empty state |
| **`/attendee/event/seats`** | `app/attendee/event/seats/page.tsx` | RoleAreaShell | Loads order from `?order=`; errors → message or redirect; success → **`SeatAssignmentForm`** (seat toggles, guest name/email per seat, submit) |
| **`/attendee/event/tickets/[ticketId]`** | `app/attendee/event/tickets/[ticketId]/page.tsx` | RoleAreaShell (**flush**, title “Your ticket”) | Back link to event; **print root** article: email status strip, header, guest/seat **dl**, QR **img**, monospace payload; **`TicketPrintButton`** below |

### 5.3 Organizer

| Route | File | Shell | Structure / UX |
|-------|------|-------|----------------|
| **`/organizer`** | `app/organizer/page.tsx` | PublicShell | Header “Your events” + **New event** button; optional `?error=` banner; list of **cards** (name, status chip, slug, date) with **Dashboard** / **Configure** links, or empty panel |
| **`/organizer/events/new`** | `app/organizer/events/new/page.tsx` | PublicShell | Back link; page header; optional error; **multi-section form** in organizer panel (basics, schedule, slug, hold minutes, publishing callout) |
| **`/organizer/events/[eventId]`** | `app/organizer/events/[eventId]/page.tsx` | PublicShell | Back + **Operations dashboard** link; event title + status; **long single scroll**: (1) **event** `updateEvent` form, (2) **ticket types** (add form + per-type edit cards), (3) **check-in staff** (invite form, invitations list, scanners list with revoke), (4) **seat inventory** per type (grid rows with inline **Save row** forms) |
| **`/organizer/events/[eventId]/dashboard`** | `app/organizer/events/[eventId]/dashboard/page.tsx` | PublicShell | Breadcrumb-style links (events / setup / scanner); **metrics** grid; availability table; paid-awaiting-seats table; all orders; tickets & attendees; recent scan activity — all **tables** with chips |
| **`/organizer/events/[eventId]/scan`** | `app/organizer/events/[eventId]/scan/page.tsx` | PublicShell | Back to event setup; compact header; **`EventCheckInScanner`** (organizer owns event) |

### 5.4 Staff

| Route | File | Shell | Structure / UX |
|-------|------|-------|----------------|
| **`/staff`** | `app/staff/page.tsx` | RoleAreaShell (**staff**, “Check-in scanner”) | Success/error banners; explainer; **list of active events** (card + **Open scanner**); optional **revoked** list; `PlaceholderNotice` |
| **`/staff/events/[eventId]/scanner`** | `app/staff/events/[eventId]/scanner/page.tsx` | RoleAreaShell (**staff**, **flush**) | **`EventCheckInScanner`**; auth + active `event_staff` required |
| **`/staff/invite/accept`** | `app/staff/invite/accept/page.tsx` | PublicShell | **Token** from `?token=`; invalid token → centered message + sign in link; else intro + error banner; signed-in → **accept** form; signed-out → **Sign in** / **Create account** buttons with `next` preserved |

### 5.5 Super Admin

| Route | File | Shell | Structure / UX |
|-------|------|-------|----------------|
| **`/super-admin`** | `app/super-admin/page.tsx` | RoleAreaShell (**super_admin**, **flush**, **wide**) | Query banners; intro card + SMTP summary + link to **`/super-admin/smtp`**; **PlatformMetricGrid**; suspended quick view; **All users** table + per-row actions; organizers table; **All events** table + suspend/restore; **Audit log** table |
| **`/super-admin/smtp`** | `app/super-admin/smtp/page.tsx` | RoleAreaShell (**flush**, **wide**) | **`SmtpSettingsForm`** (full SMTP management UI) |

### 5.6 Non-HTML routes (reference)

These are not “pages” but affect UX flow:

| Route | Purpose |
|-------|---------|
| `app/auth/callback/route.ts` | Auth callback |
| `app/auth/sign-out/route.ts` | Sign out |
| `app/api/hitpay/webhook/route.ts` | HitPay webhook (no UI) |

---

## 6. Navigation model summary

| Mechanism | Present |
|-----------|---------|
| **Global top nav** | Yes — `SiteHeader` on PublicShell & RoleAreaShell |
| **Sidebar / drawer** | No |
| **Breadcrumbs** | Informal text links (organizer event, dashboard, scan paths) |
| **Role-gated areas** | Enforced in pages/server (redirects, `notFound()`); header does not hide links by role |
| **Mobile navigation** | Same links wrap (`flex-wrap`); no separate mobile menu |

---

## 7. How to extend this doc

When adding routes, create `app/.../page.tsx` and update **Section 5**. When adding shells or chrome, update **Sections 2–3**. For design token changes, update **Section 1** and `docs/eventuz-design-guide.md`.
