import { createClient } from "@/lib/supabase/server";
import { RoleAreaShell } from "@/components/layout/RoleAreaShell";

export default async function SuperAdminHomePage() {
  const supabase = await createClient();

  const [{ data: profiles }, { data: events }] = await Promise.all([
    supabase.from("profiles").select("*").order("created_at", { ascending: false }).limit(100),
    supabase.from("events").select("*").order("created_at", { ascending: false }).limit(100),
  ]);

  return (
    <RoleAreaShell role="super_admin" title="Super Admin">
      <div className="space-y-8">
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Read-only overview for Phase 1. Promote roles via SQL (
          <code className="text-xs">profiles.role</code>). SMTP and disable controls come in later
          phases.
        </p>

        <div>
          <h2 className="mb-2 text-sm font-semibold text-zinc-800 dark:text-zinc-200">Profiles</h2>
          <div className="overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-700">
            <table className="w-full min-w-[480px] text-left text-xs">
              <thead className="bg-zinc-100 dark:bg-zinc-800/80">
                <tr>
                  <th className="p-2">User</th>
                  <th className="p-2">Name</th>
                  <th className="p-2">Role</th>
                  <th className="p-2">Created</th>
                </tr>
              </thead>
              <tbody>
                {(profiles ?? []).map((p) => (
                  <tr key={p.id} className="border-t border-zinc-200 dark:border-zinc-700">
                    <td className="p-2 font-mono text-[10px] text-zinc-500">{p.id}</td>
                    <td className="p-2">{p.full_name}</td>
                    <td className="p-2">{p.role}</td>
                    <td className="p-2">{p.created_at?.slice(0, 10)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!profiles?.length ? (
              <p className="p-4 text-xs text-zinc-500">No profiles (run DB migration &amp; sign up).</p>
            ) : null}
          </div>
        </div>

        <div>
          <h2 className="mb-2 text-sm font-semibold text-zinc-800 dark:text-zinc-200">Events</h2>
          <div className="overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-700">
            <table className="w-full min-w-[480px] text-left text-xs">
              <thead className="bg-zinc-100 dark:bg-zinc-800/80">
                <tr>
                  <th className="p-2">Name</th>
                  <th className="p-2">Slug</th>
                  <th className="p-2">Status</th>
                  <th className="p-2">Organizer</th>
                </tr>
              </thead>
              <tbody>
                {(events ?? []).map((e) => (
                  <tr key={e.id} className="border-t border-zinc-200 dark:border-zinc-700">
                    <td className="p-2">{e.name}</td>
                    <td className="p-2">{e.public_slug}</td>
                    <td className="p-2">{e.status}</td>
                    <td className="p-2 font-mono text-[10px] text-zinc-500">{e.organizer_id}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!events?.length ? (
              <p className="p-4 text-xs text-zinc-500">No events yet.</p>
            ) : null}
          </div>
        </div>
      </div>
    </RoleAreaShell>
  );
}
