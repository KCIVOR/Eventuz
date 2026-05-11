/** Shared Tailwind patterns — Soft UI–style depth, Eventuz tokens (see globals.css). */

export const organizerPanel =
  "rounded-2xl border border-border bg-card shadow-[0_2px_12px_rgba(28,25,23,0.06)] transition-shadow duration-200 hover:shadow-[0_4px_20px_rgba(28,25,23,0.08)]";

export const organizerField =
  "w-full rounded-xl border border-border bg-card px-3 py-2.5 text-sm text-foreground shadow-[inset_0_1px_1px_rgba(28,25,23,0.04)] transition-[border-color,box-shadow] duration-200 placeholder:text-muted-foreground focus-visible:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20";

export const organizerLabel =
  "text-xs font-semibold uppercase tracking-wide text-muted-foreground";

export const organizerSectionTitle = "font-serif text-lg font-semibold tracking-tight text-foreground";

export const organizerBtnPrimary =
  "inline-flex cursor-pointer items-center justify-center rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-[0_1px_2px_rgba(28,25,23,0.06)] transition-colors duration-200 hover:bg-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30";

export const organizerBtnSecondary =
  "inline-flex cursor-pointer items-center justify-center rounded-xl border border-border bg-card px-4 py-2 text-sm font-semibold text-foreground transition-colors duration-200 hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20";

export const organizerLink =
  "font-medium text-primary underline decoration-accent-gold/50 underline-offset-4 transition-colors duration-200 hover:text-primary-hover cursor-pointer";

export const organizerCallout =
  "rounded-xl border border-primary/15 bg-primary/[0.04] px-4 py-3 text-sm text-foreground";

export const organizerPlaceholderPanel =
  "rounded-2xl border border-dashed border-border bg-muted/25 px-6 py-8 text-center text-sm text-muted-foreground";

/** Nested block inside a panel (ticket type card). */
export const organizerInset =
  "rounded-xl border border-border/80 bg-muted/15 p-4 sm:p-5 transition-colors duration-200 hover:bg-muted/25";
