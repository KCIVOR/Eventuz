import { Button } from "@/components/ui/Button";
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
      title="Your events"
      description="Manage your active events or create a new one to start selling tickets."
      layout="flush"
      mainWidth="wide"
      withoutFrame
      actions={
        <Button asChild>
          <Link href="/organizer/events/new">
            Create event
          </Link>
        </Button>
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
          <Button asChild>
            <Link href="/organizer/events/new">
              Create your event
            </Link>
          </Button>
        </EmptyState>
        <p className="text-center text-xs text-muted-foreground">
          Already started?{" "}
          <Link href="/login" className="font-medium text-primary underline decoration-accent-gold/50 underline-offset-4 transition-colors duration-200 hover:text-primary-hover cursor-pointer">
            Sign in
          </Link>{" "}
          with the account you used to register.
        </p>
      </div>
    </RoleAreaShell>
  );
}
