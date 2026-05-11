const eventStyles: Record<string, string> = {
  published: "border-success/35 bg-success-muted text-success",
  draft: "border-border bg-muted/70 text-muted-foreground",
  disabled: "border-destructive/25 bg-destructive-muted text-destructive",
};

const profileStyles: Record<string, string> = {
  organizer: "border-primary/25 bg-primary/5 text-primary",
  attendee: "border-border bg-muted/60 text-muted-foreground",
  staff: "border-accent-gold/40 bg-muted/40 text-foreground",
  super_admin: "border-accent-gold/50 bg-muted/50 text-primary",
};

export function EventStatusChip({ status }: { status: string }) {
  const cls = eventStyles[status] ?? "border-border bg-muted/50 text-foreground";
  return (
    <span
      className={`inline-block rounded-full border px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${cls}`}
    >
      {status.replaceAll("_", " ")}
    </span>
  );
}

export function RoleStatusChip({ role }: { role: string }) {
  const cls = profileStyles[role] ?? "border-border bg-muted/50 text-foreground";
  return (
    <span
      className={`inline-block rounded-full border px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${cls}`}
    >
      {role.replaceAll("_", " ")}
    </span>
  );
}

const accountStyles: Record<string, string> = {
  active: "border-success/35 bg-success-muted text-success",
  disabled: "border-destructive/25 bg-destructive-muted text-destructive",
  pending: "border-warning/35 bg-warning/10 text-warning",
};

export function ProfileAccountStatusChip({ status }: { status: string }) {
  const cls = accountStyles[status] ?? "border-border bg-muted/60 text-muted-foreground";
  return (
    <span
      className={`inline-block rounded-full border px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${cls}`}
    >
      {status.replaceAll("_", " ")}
    </span>
  );
}
