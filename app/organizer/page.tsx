import {
  organizerBtnPrimary,
  organizerLink,
} from "@/components/organizer/eventSetupStyles";
import { RoleAreaShell } from "@/components/layout/RoleAreaShell";
import { EmptyState } from "@/components/ui/EmptyState";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { redirect } from "next/navigation";

type Props = { searchParams: Promise<{ error?: string }> };

/** Organizer home: single wedding — redirect to dashboard when an event exists */
export default async function OrganizerHomePage({ searchParams }: Props) {
  const q = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: events } = user
    ? await supabase
        .from("events")
        .select("id")
        .eq("organizer_id", user.id)
        .order("updated_at", { ascending: false })
        .limit(1)
    : { data: null };

  if (events?.length) {
    redirect(`/organizer/events/${events[0]!.id}/dashboard`);
  }

  return (
    <RoleAreaShell
      role="organizer"
      layout="flush"
      mainWidth="wide"
      title="Your wedding event"
      description="Create one event for your celebration — seating, tickets, and check-in stay on this workspace."
      actions={
        <Link href="/organizer/events/new" className={organizerBtnPrimary}>
          Create event
        </Link>
      }
    >
      <div className="flex flex-1 flex-col gap-8">
        {q.error ? (
          <p className="rounded-xl border border-destructive/25 bg-destructive-muted px-4 py-3 text-sm text-destructive">
            {q.error}
          </p>
        ) : null}

        <EmptyState
          title="No event yet"
          description="Eventuz supports one event per organizer account — ideal for a single wedding or celebration. Create your workspace to manage seating, tickets, and check-in."
        >
          <Link href="/organizer/events/new" className={organizerBtnPrimary + " inline-flex"}>
            Create your event
          </Link>
        </EmptyState>
        <p className="text-center text-xs text-muted-foreground">
          Already started?{" "}
          <Link href="/login" className={organizerLink}>
            Sign in
          </Link>{" "}
          with the account you used to register.
        </p>
      </div>
    </RoleAreaShell>
  );
}
