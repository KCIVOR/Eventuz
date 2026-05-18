import React from "react";
import { EventStatusChip } from "./AdminStatusChip";
import { Button } from "@/components/ui/Button";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { ListPagination } from "@/components/ui/ListPagination";
import { DEFAULT_LIST_PAGE_SIZE } from "@/lib/ui/pagination";
import type { SerializableSearchParams } from "@/lib/ui/paginationUrl";
import { superAdminSetEventRegistrationBlockedAction } from "@/app/super-admin/actions";

import { ScrollableTableWrapper } from "@/components/ui/ScrollableTableWrapper";

type EventRow = {
  id: string;
  name: string;
  public_slug: string;
  status: string;
  event_date: string;
  organizer_id: string;
};

type Props = {
  events: EventRow[];
  pageData: {
    slice: EventRow[];
    page: number;
    total: number;
    pageCount: number;
    rangeStart: number;
    rangeEnd: number;
  };
  pathname: string;
  searchParams: SerializableSearchParams;
  organizerNameById: Record<string, string>;
  paramKey: string;
  listLabel: string;
};

export function SuperAdminEventsTable({
  events: _events,
  pageData,
  pathname,
  searchParams,
  organizerNameById,
  paramKey,
  listLabel,
}: Props) {
  return (
    <ScrollableTableWrapper
      footer={pageData.total > 0 ? (
        <ListPagination
          pathname={pathname}
          searchParams={searchParams}
          paramKey={paramKey}
          page={pageData.page}
          pageSize={DEFAULT_LIST_PAGE_SIZE}
          total={pageData.total}
          pageCount={pageData.pageCount}
          rangeStart={pageData.rangeStart}
          rangeEnd={pageData.rangeEnd}
          listLabel={listLabel}
        />
      ) : null}
    >
      <table className="w-full min-w-[900px] text-left text-sm">
        <caption className="sr-only">{listLabel}</caption>
        <thead className="bg-muted/50 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          <tr>
            <th scope="col" className="p-3">Name</th>
            <th scope="col" className="p-3">Slug</th>
            <th scope="col" className="p-3">Status</th>
            <th scope="col" className="p-3">Date</th>
            <th scope="col" className="p-3">Organizer</th>
            <th scope="col" className="p-3 text-right">Registration</th>
          </tr>
        </thead>
        <tbody>
          {pageData.slice.map((e) => (
            <tr
              key={e.id}
              className="border-t border-border transition-colors duration-150 hover:bg-muted/25"
            >
              <td className="p-3 font-medium text-foreground">{e.name}</td>
              <td className="p-3 text-muted-foreground">{e.public_slug}</td>
              <td className="p-3">
                <EventStatusChip status={e.status} />
              </td>
              <td className="p-3 tabular-nums text-muted-foreground">{e.event_date}</td>
              <td className="p-3 text-foreground">
                {organizerNameById[e.organizer_id] ?? shortId(e.organizer_id)}
              </td>
              <td className="p-3">
                <div className="flex flex-wrap justify-end gap-2">
                  {e.status === "disabled" ? (
                    <form action={superAdminSetEventRegistrationBlockedAction}>
                      <input type="hidden" name="event_id" value={e.id} />
                      <input type="hidden" name="blocked" value="false" />
                      <SubmitButton variant="secondary" size="sm">
                        Restore draft
                      </SubmitButton>
                    </form>
                  ) : (
                    <form action={superAdminSetEventRegistrationBlockedAction}>
                      <input type="hidden" name="event_id" value={e.id} />
                      <input type="hidden" name="blocked" value="true" />
                      <SubmitButton variant="destructive" size="sm">
                        Suspend
                      </SubmitButton>
                    </form>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {!pageData.slice.length && (
        <p className="border-t border-border p-6 text-center text-muted-foreground">No matching events.</p>
      )}
    </ScrollableTableWrapper>
  );
}

function shortId(id: string) {
  if (id.length <= 12) return id;
  return `${id.slice(0, 8)}…`;
}
