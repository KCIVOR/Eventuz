import { loadPlatformOverview } from "@/lib/super-admin/loadPlatformOverview";
import { RoleAreaShell } from "@/components/layout/RoleAreaShell";
import { SuperAdminUsersTable } from "@/components/super-admin/SuperAdminUsersTable";
import { DEFAULT_LIST_PAGE_SIZE, parsePageParam, slicePage } from "@/lib/ui/pagination";
import type { SerializableSearchParams } from "@/lib/ui/paginationUrl";
import { createClient } from "@/lib/supabase/server";

type Props = { searchParams: Promise<SerializableSearchParams> };

export default async function SuperAdminUsersPage({ searchParams }: Props) {
  const q = await searchParams;
  const overview = await loadPlatformOverview();
  const { profiles } = overview;

  const pgPr = parsePageParam(q.lp_pr);
  const pgOr = parsePageParam(q.lp_or);

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const selfId = user?.id ?? "";

  const organizers = profiles.filter((p) => p.role === "organizer");
  const profilesPage = slicePage(profiles, pgPr, DEFAULT_LIST_PAGE_SIZE);
  const organizersPage = slicePage(organizers, pgOr, DEFAULT_LIST_PAGE_SIZE);

  return (
    <RoleAreaShell
      role="super_admin"
      title="User Management"
      description="Manage all platform users and organizers."
      layout="flush"
      mainWidth="wide"
      withoutFrame
    >
      <div className="space-y-10">
        <section className="space-y-3">
          <div className="flex items-end justify-between border-b border-border pb-3">
            <h2 className="font-serif text-xl font-semibold text-foreground">All Users</h2>
            <p className="text-xs text-muted-foreground">Loaded {profiles.length} profiles</p>
          </div>
          <SuperAdminUsersTable 
            profiles={profiles} 
            pageData={profilesPage} 
            pathname="/super-admin/users" 
            searchParams={q} 
            selfId={selfId} 
            paramKey="lp_pr" 
            listLabel="All platform users" 
          />
        </section>

        <section className="space-y-3">
          <h2 className="font-serif text-xl font-semibold text-foreground">Organizers Only</h2>
          <SuperAdminUsersTable 
            profiles={organizers} 
            pageData={organizersPage} 
            pathname="/super-admin/users" 
            searchParams={q} 
            selfId={selfId} 
            paramKey="lp_or" 
            listLabel="Organizers" 
            showCreated={false}
          />
        </section>
      </div>
    </RoleAreaShell>
  );
}
