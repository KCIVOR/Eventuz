import type { ReactNode } from "react";

type Props = {
  title: string;
  description?: string;
  /** Primary actions or links */
  children?: ReactNode;
  className?: string;
};

/** Shared empty pattern — dashed border, muted surface, serif title (matches organizer placeholders). */
export function EmptyState({ title, description, children, className = "" }: Props) {
  return (
    <div
      className={`rounded-2xl border border-dashed border-border bg-muted/15 px-6 py-10 text-center sm:px-8 ${className}`.trim()}
    >
      <p className="font-serif text-lg font-semibold tracking-tight text-foreground">{title}</p>
      {description ? (
        <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">{description}</p>
      ) : null}
      {children ? <div className="mt-6 flex flex-wrap justify-center gap-3">{children}</div> : null}
    </div>
  );
}
