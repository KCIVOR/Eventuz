import { createClient } from "@/lib/supabase/server";
import { PublicShell } from "@/components/layout/PublicShell";
import Link from "next/link";

export default async function OrganizerHomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: events } = user
    ? await supabase
        .from("events")
        .select("id, name, status, public_slug, event_date, updated_at")
        .eq("organizer_id", user.id)
        .order("updated_at", { ascending: false })
    : { data: null };

  return (
    <PublicShell>
      <div className="flex flex-1 flex-col gap-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
              Organizer
            </h1>
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
              Create and configure events, ticket types, and seat inventory (Phase 1).
            </p>
          </div>
          <Link
            href="/organizer/events/new"
            className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white dark:bg-zinc-100 dark:text-zinc-900"
          >
            New event
          </Link>
        </div>

        {!events?.length ? (
          <p className="rounded-xl border border-dashed border-zinc-300 p-10 text-center text-sm text-zinc-500 dark:border-zinc-700">
            No events yet.{" "}
            <Link href="/organizer/events/new" className="font-medium text-zinc-900 underline dark:text-zinc-100">
              Create your first event
            </Link>
            .
          </p>
        ) : (
          <ul className="divide-y divide-zinc-200 rounded-xl border border-zinc-200 bg-white dark:divide-zinc-800 dark:border-zinc-800 dark:bg-zinc-900/50">
            {events.map((ev) => (
              <li key={ev.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-4">
                <div>
                  <Link
                    href={`/organizer/events/${ev.id}`}
                    className="font-medium text-zinc-900 hover:underline dark:text-zinc-50"
                  >
                    {ev.name}
                  </Link>
                  <p className="text-xs text-zinc-500">
                    {ev.public_slug} · {ev.status} · {ev.event_date}
                  </p>
                </div>
                <Link
                  href={`/organizer/events/${ev.id}`}
                  className="text-sm text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
                >
                  Edit →
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </PublicShell>
  );
}
