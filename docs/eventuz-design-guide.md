# Eventuz design guide

Reference for **color, typography, layout, and tone** so organizer, attendee, staff, and admin surfaces stay consistent. Optimized for a **wedding / formal events** product: calm, premium, invitation-like—not playful SaaS.

---

## Design intent

| Goal | Direction |
|------|-----------|
| Feel | Calm, premium, trustworthy (payments, seating, QR) |
| Readability | Forms and tables readable; sufficient contrast on phones |
| Market | Philippines wedding/event sector—warm neutrals, restrained accent |
| Density | Organizer tools may be data-heavy; attendee flows stay spacious |

---

## Color system

Map these to **CSS variables** (e.g. in `globals.css`) and reuse across components. Prefer semantic tokens in code (`--primary`, `--background`) over raw hex in one-off styles.

### Core (always-on)

| Token | Light | Dark (optional later) | Usage |
|-------|-------|------------------------|--------|
| Background | `#FAF8F5` | `#121418` | Page background (warm off-white, not stark white) |
| Surface / card | `#FFFFFF` | `#1A1D24` | Cards, modals, panels |
| Text primary | `#1C1917` | `#F4F4F5` | Headings, body |
| Text muted | `#57534E` | `#A1A1AA` | Secondary labels, hints |
| Border / divider | `#E7E5E4` | `#27272A` | Hairlines, table borders |

### Accent

| Token | Value | Usage |
|-------|-------|--------|
| Primary | `#722F37` (wine / rosewood) | Primary buttons, key links, focus rings |
| Primary hover | `#8B3A42` (slightly lighter) | Hover state only |

Use **one** primary accent for CTAs; avoid competing bright colors.

### Optional secondary accent (use sparingly)

| Token | Value | Usage |
|-------|-------|--------|
| Gold muted | `#A68A56` | Thin borders, icon highlights, subtle dividers—not large fills |

### Semantic (fixed meanings)

| State | Foreground / base | Notes |
|-------|-------------------|--------|
| Success | `#166534` | Pair with very light green tint for banners |
| Warning | `#A16207` | Holds, expiring checkout |
| Error | `#B91C1C` | Payment failure, validation |
| Info | `#1D4ED8` | Rare; prefer neutral copy + structure |

---

## Typography

### Families

| Role | Font | Fallback stack |
|------|------|----------------|
| Headings (display) | **Cormorant Garamond** | `Cormorant Garamond`, `Georgia`, serif |
| UI + body | **Inter** | `Inter`, system-ui, sans-serif |

**Rule:** At most **one serif + one sans** in the product. Do not add a third display face.

### Scale (starting point)

| Level | Approx. size | Weight | Use |
|-------|----------------|--------|-----|
| Page title | ~24px (1.5rem) | 600 | Top of page |
| Section | ~20px (1.25rem) | 600 | Major sections |
| Subsection | ~16px (1rem) | 600 | Cards, panels |
| Body | 15–16px | 400–500 | Forms, paragraphs |
| Small / caption | 12–13px | 400–500 | Metadata, table secondary |

- **Body line height:** 1.5–1.6  
- **Money and counts:** use **tabular figures** (Inter supports `font-variant-numeric: tabular-nums` where needed)

### Optional product split

- **Attendee / public event pages:** serif headings allowed for “invitation” feel.  
- **Organizer / staff / super admin:** may lean **sans-only** for density; keep **same palette and primary button** for consistency.

---

## Shape, space, motion

| Aspect | Guideline |
|--------|-----------|
| Border radius | **10–14px** default on cards and buttons; avoid ultra-pill except a single hero CTA variant if desired |
| Spacing | **8px grid:** 8, 16, 24, 32; attendee checkout gets extra vertical rhythm |
| Shadows | Soft, low spread—or flat surfaces with border only |
| Motion | **150–200ms** ease; use for toasts, dialogs, page transitions—not decorative clutter |

---

## Iconography

- **Set:** Lucide or Phosphor (one family, one weight project-wide).  
- **Style:** Thin or regular; same stroke weight everywhere.  
- **Color:** Default to muted text color; primary only for active states.

---

## Imagery

- Marketing / event hero: warm, natural light; avoid neon stock.  
- **Dashboard / settings:** neutral UI; minimal decorative wedding graphics.

---

## Implementation checklist (for engineers)

1. Define CSS variables in `:root` (and `[data-theme="dark"]` if/when dark mode ships).  
2. Define Tailwind 4 `@utility` classes in `app/globals.css` (e.g. `panel-card`, `input-eventuz`, `section-title`) for shared layouts.
3. Load **Cormorant Garamond** + **Inter** via `next/font/google` in the root layout.  
4. Use centralized components in `components/ui/`: `Button` (primary/secondary/outline/ghost), `StatusBadge`, `ScrollableTableWrapper`.
5. Ensure **:focus-visible** uses primary color with clear ring (accessibility).

---

## Open choices (decide once, then encode)

| Decision | Options | Notes |
|----------|---------|--------|
| Dark mode | Ship later vs day one | Wedding MVP often **light-first** |
| Serif scope | All surfaces vs public-only headings | Affects layout import pattern |

---

## Version

- **Created:** aligned with Eventuz MVP Phase 2 kickoff.  
- **Purpose:** single source of truth for visual consistency until a dedicated design system package exists.
- **Implementation:** tokens live in `app/globals.css` (`:root` + `@theme inline`); fonts in `app/layout.tsx` via `next/font` (`Inter`, `Cormorant Garamond`).
