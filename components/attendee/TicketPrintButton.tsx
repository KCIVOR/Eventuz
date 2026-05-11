"use client";

type Props = { className?: string };

export function TicketPrintButton({ className }: Props) {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className={
        className ??
        "no-print inline-flex min-h-11 cursor-pointer items-center justify-center rounded-xl border border-border bg-card px-5 text-sm font-semibold text-foreground transition-colors duration-200 motion-reduce:transition-none hover:border-primary/40 hover:bg-muted/30 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
      }
    >
      Print or save as PDF
    </button>
  );
}
