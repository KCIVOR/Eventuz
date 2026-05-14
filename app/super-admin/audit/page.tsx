import { loadRecentAuditLogs } from "@/lib/super-admin/loadRecentAuditLogs";
import { RoleAreaShell } from "@/components/layout/RoleAreaShell";
import { SuperAdminAuditLog } from "@/components/super-admin/SuperAdminAuditLog";
import { DEFAULT_LIST_PAGE_SIZE, parsePageParam, slicePage } from "@/lib/ui/pagination";
import type { SerializableSearchParams } from "@/lib/ui/paginationUrl";
import {
  filterAndSortAuditLogs,
  getAuditLogFilterOptions,
  parseAuditLogFilters,
} from "@/lib/super-admin/auditLogFilters";

type Props = { searchParams: Promise<SerializableSearchParams> };

export default async function SuperAdminAuditPage({ searchParams }: Props) {
  const q = await searchParams;
  const auditRows = await loadRecentAuditLogs();
  const filters = parseAuditLogFilters(q);
  const filterOptions = getAuditLogFilterOptions(auditRows);
  const filteredAuditRows = filterAndSortAuditLogs(auditRows, filters);
  
  const pgAu = parsePageParam(q.lp_au);
  const auditPage = slicePage(filteredAuditRows, pgAu, DEFAULT_LIST_PAGE_SIZE);

  return (
    <RoleAreaShell
      role="super_admin"
      title="Audit Logs"
      description="Historical record of critical platform actions."
      layout="flush"
      mainWidth="wide"
      withoutFrame
    >
      <section className="space-y-3">
        <div className="flex items-baseline justify-between gap-2 border-b border-border pb-3">
          <h2 className="font-serif text-xl font-semibold text-foreground">Critical Actions</h2>
          <p className="text-xs text-muted-foreground">Recent activity</p>
        </div>
        <SuperAdminAuditLog 
          auditRows={filteredAuditRows} 
          pageData={auditPage} 
          pathname="/super-admin/audit" 
          searchParams={q} 
          filterState={filters}
          filterOptions={filterOptions}
          showControls
        />
      </section>
    </RoleAreaShell>
  );
}
