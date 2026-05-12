import { ListPagination } from "@/components/ui/ListPagination";
import { RoleAreaShell } from "@/components/layout/RoleAreaShell";
import { PlaceholderNotice } from "@/components/ui/PlaceholderNotice";
import { DEFAULT_LIST_PAGE_SIZE, parsePageParam, slicePage } from "@/lib/ui/pagination";
import type { SerializableSearchParams } from "@/lib/ui/paginationUrl";
import { createClient } from "@/lib/supabase/server";
import { nestedOne } from "@/lib/supabase/nestedOne";
import Link from "next/link";
import { redirect } from "next/navigation";

type Props = {
  searchParams: Promise<SerializableSearchParams>;
};

export default async function StaffHomePage({ searchParams }: Props) {
  const q = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/staff");

  const { data: rows } = await supabase
    .from("event_staff")
    .select(
      `id, event_id, status, role,
       events ( id, name, venue, event_date, event_time, status )`
    )
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  const active = (rows ?? []).filter((r) => r.status === "active");
  const revoked = (rows ?? []).filter((r) => r.status === "revoked");
  const pgAct = parsePageParam(q.lp_sa);
  const activePage = slicePage(active, pgAct, DEFAULT_LIST_PAGE_SIZE);
  const staffPath = "/staff";
  const errRaw = typeof q.error === "string" ? q.error : "";

  return (
    <RoleAreaShell
      role="staff"
      title="Check-in scanner"
      description="Scan QR tickets at the venue for events you’re assigned to."
      layout="flush"
      mainWidth="wide"
      withoutFrame
    >
      {q.accepted === "1" ? (
        <p className="mb-4 rounded-xl border border-success/25 bg-success-muted px-4 py-3 text-center text-sm text-success">
          Invitation accepted. You can open the scanner for events listed below.
        </p>
      ) : null}
      {errRaw ? (
        <p className="mb-4 rounded-xl border border-destructive/25 bg-destructive-muted px-4 py-3 text-center text-sm text-destructive">
          {decodeUri(errRaw)}
        </p>
      ) : null}

      <p className="mb-6 text-center text-sm text-muted-foreground">
        Staff use this area to scan QR tickets at the venue. Validation rules ship in a later phase.
      </p>

      {active.length === 0 ? (
        <p className="mb-6 text-center text-sm text-muted-foreground">
          You don’t have active scanner access yet. Ask an organizer to send you an invitation email.
        </p>
      ) : (
        <>
          <ul
            id="event-scanners"
            className="mx-auto mb-4 max-w-lg scroll-mt-28 space-y-3"
          >
            {activePage.slice.map((r) => {
            const ev = nestedOne(
              r.events as
                | {
                    name: string;
                    venue: string;
                    event_date: string;
                    event_time: string;
                    status: string;
                  }
                | null
                | Array<{
                    name: string;
                    venue: string;
                    event_date: string;
                    event_time: string;
                    status: string;
                  }>
            );
            const name = ev?.name ?? "Event";
            return (
              <li
                key={r.id as string}
                className="rounded-xl border border-border bg-card px-4 py-4 shadow-sm"
              >
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="font-semibold text-foreground">{name}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {(ev?.event_date as string) ?? ""} · {String(ev?.event_time ?? "")}{" "}
                      {ev?.venue ? `· ${ev.venue}` : ""}
                    </p>
                    <p className="mt-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                      Role: {(r.role as string) ?? "scanner"} · {ev?.status ?? ""}
                    </p>
                  </div>
                  <Link
                    href={`/staff/events/${r.event_id as string}/scanner`}
                    className="inline-flex justify-center rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary-hover"
                  >
                    Open scanner
                  </Link>
                </div>
              </li>
            );
          })}
          </ul>
          <ListPagination
            pathname={staffPath}
            searchParams={q}
            paramKey="lp_sa"
            page={activePage.page}
            pageSize={DEFAULT_LIST_PAGE_SIZE}
            total={activePage.total}
            pageCount={activePage.pageCount}
            rangeStart={activePage.rangeStart}
            rangeEnd={activePage.rangeEnd}
            listLabel="Active scanner assignments"
          />
        </>
      )}

      {revoked.length > 0 ? (
        <div className="mx-auto mb-8 max-w-lg rounded-xl border border-border/80 bg-muted/30 px-4 py-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Revoked access
          </p>
          <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
            {revoked.map((r) => {
              const ev = nestedOne(
                r.events as { name: string } | { name: string }[] | null
              );
              return (
                <li key={r.id as string}>{ev?.name ?? "Event"} — no longer available</li>
              );
            })}
          </ul>
        </div>
      ) : null}

      <PlaceholderNotice label="Camera / manual code entry and check-in results" />
    </RoleAreaShell>
  );
}

function decodeUri(s: string): string {
  try {
    return decodeURIComponent(s);
  } catch {
    return s;
  }
}
