import React from "react";
import { ProfileAccountStatusChip, RoleStatusChip } from "./AdminStatusChip";
import { Button } from "@/components/ui/Button";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { ListPagination } from "@/components/ui/ListPagination";
import { DEFAULT_LIST_PAGE_SIZE } from "@/lib/ui/pagination";
import type { SerializableSearchParams } from "@/lib/ui/paginationUrl";
import { superAdminSetUserAccountStatusAction } from "@/app/super-admin/actions";

import { ScrollableTableWrapper } from "@/components/ui/ScrollableTableWrapper";

type UserProfile = {
  id: string;
  full_name: string | null;
  email: string | null;
  role: string;
  status?: string | null;
  created_at?: string | null;
};

type Props = {
  profiles: UserProfile[];
  pageData: {
    slice: UserProfile[];
    page: number;
    total: number;
    pageCount: number;
    rangeStart: number;
    rangeEnd: number;
  };
  pathname: string;
  searchParams: SerializableSearchParams;
  selfId: string;
  paramKey: string;
  listLabel: string;
  showRole?: boolean;
  showCreated?: boolean;
};

export function SuperAdminUsersTable({
  profiles: _profiles,
  pageData,
  pathname,
  searchParams,
  selfId,
  paramKey,
  listLabel,
  showRole = true,
  showCreated = true,
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
      <table className="w-full min-w-[800px] text-left text-sm">
        <caption className="sr-only">{listLabel}</caption>
        <thead className="bg-muted/50 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          <tr>
            <th scope="col" className="p-3">User ID</th>
            <th scope="col" className="p-3">Name</th>
            <th scope="col" className="p-3">Email</th>
            {showRole && <th scope="col" className="p-3">Role</th>}
            <th scope="col" className="p-3">Account</th>
            {showCreated && <th scope="col" className="p-3">Created</th>}
            <th scope="col" className="p-3 text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="text-foreground">
          {pageData.slice.map((p) => (
            <tr
              key={p.id}
              className="border-t border-border transition-colors duration-150 hover:bg-muted/25"
            >
              <td className="p-3 font-mono text-xs text-muted-foreground">{shortId(p.id)}</td>
              <td className="p-3 font-medium">{p.full_name || "—"}</td>
              <td className="p-3 text-xs text-muted-foreground">{p.email ?? "—"}</td>
              {showRole && (
                <td className="p-3">
                  <RoleStatusChip role={p.role} />
                </td>
              )}
              <td className="p-3">
                <ProfileAccountStatusChip status={p.status ?? "active"} />
              </td>
              {showCreated && (
                <td className="p-3 tabular-nums text-muted-foreground">{p.created_at?.slice(0, 10) ?? "—"}</td>
              )}
              <td className="p-3">
                <div className="flex flex-wrap justify-end gap-2">
                  {p.id === selfId ? (
                    <span className="text-xs text-muted-foreground">You</span>
                  ) : (p.status ?? "active") === "disabled" ? (
                    <form action={superAdminSetUserAccountStatusAction}>
                      <input type="hidden" name="user_id" value={p.id} />
                      <input type="hidden" name="status" value="active" />
                      <SubmitButton variant="secondary" size="sm">
                        Re-enable
                      </SubmitButton>
                    </form>
                  ) : (
                    <form action={superAdminSetUserAccountStatusAction}>
                      <input type="hidden" name="user_id" value={p.id} />
                      <input type="hidden" name="status" value="disabled" />
                      <SubmitButton variant="destructive" size="sm">
                        Disable
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
        <p className="border-t border-border p-6 text-center text-muted-foreground">No matching users.</p>
      )}
    </ScrollableTableWrapper>
  );
}

function shortId(id: string) {
  if (id.length <= 12) return id;
  return `${id.slice(0, 8)}…`;
}
