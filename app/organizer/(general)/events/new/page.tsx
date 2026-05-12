import { createEvent } from "@/app/organizer/events/actions";
import { Button } from "@/components/ui/Button";
import { RoleAreaShell } from "@/components/layout/RoleAreaShell";
import { EVENT_STATUSES } from "@/lib/organizer/eventForm";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

type Props = {
  searchParams: Promise<{ error?: string }>;
};

export default async function NewEventPage({ searchParams }: Props) {
  const q = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) {
    const { data: existing } = await supabase
      .from("events")
      .select("id")
      .eq("organizer_id", user.id)
      .maybeSingle();
    if (existing?.id) {
      redirect(`/organizer/events/${existing.id}/dashboard`);
    }
  }

  return (
    <RoleAreaShell
      role="organizer"
      layout="flush"
      mainWidth="wide"
      withoutFrame
      title="Create your event"
      description="One celebration per organizer account — add details, holds, and publish when guests should register."
      breadcrumbs={[
        { label: "Home", href: "/organizer" },
        { label: "Create event" },
      ]}
    >
      <div className="mx-auto w-full max-w-2xl flex-1 flex-col">
        {q.error ? (
          <p className="mb-6 rounded-xl border border-destructive/25 bg-destructive-muted px-4 py-3 text-sm text-destructive">
            {q.error}
          </p>
        ) : null}

        <div className="panel-card p-6 sm:p-8">
          <form action={createEvent} className="flex flex-col gap-8">
            <section className="space-y-4">
              <h2 className="section-title">Basics</h2>
              <Field label="Event name" name="name" required placeholder="e.g. Santos & Cruz wedding" />
              <div className="flex flex-col gap-1.5">
                <label htmlFor="description" className="label-eventuz">
                  Description
                </label>
                <textarea
                  id="description"
                  name="description"
                  rows={4}
                  className="input-eventuz"
                  placeholder="What guests should know (optional)."
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label htmlFor="status" className="label-eventuz">
                  Status
                </label>
                <select id="status" name="status" className="input-eventuz" defaultValue="draft">
                  {EVENT_STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {s === "draft"
                        ? "Draft — not visible to attendees"
                        : s === "published"
                          ? "Published — visible when registration is enabled"
                          : "Disabled — hidden from registration"}
                    </option>
                  ))}
                </select>
              </div>
            </section>

            <section className="space-y-4 border-t border-border pt-8">
              <h2 className="section-title">Schedule & location</h2>
              <Field label="Venue" name="venue" placeholder="City or venue name" />
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Event date" name="event_date" type="date" required />
                <Field label="Event time" name="event_time" type="time" required />
              </div>
            </section>

            <section className="space-y-4 border-t border-border pt-8">
              <h2 className="section-title">Public link</h2>
              <p className="text-sm text-muted-foreground">
                Used in your event URL. Leave blank to derive from the name; we&apos;ll ensure it&apos;s
                unique.
              </p>
              <Field
                label="Public slug"
                name="public_slug"
                placeholder="e.g. santos-cruz-2026"
                autoComplete="off"
              />
            </section>

            <section className="space-y-4 border-t border-border pt-8">
              <h2 className="section-title">Hold durations (minutes)</h2>
              <p className="text-sm text-muted-foreground">
                Optional on create: leave empty to use the defaults defined on your database (not
                hardcoded in the app). Values must be whole minutes, 1–525600.
              </p>
              <fieldset className="grid gap-4 rounded-xl border border-border bg-muted/30 p-4 sm:grid-cols-3">
                <legend className="label-eventuz px-1">Per-event timing</legend>
                <Field
                  label="Capacity hold"
                  name="capacity_hold_minutes"
                  type="number"
                  min={1}
                  placeholder="DB default"
                />
                <Field
                  label="Payment hold"
                  name="payment_hold_minutes"
                  type="number"
                  min={1}
                  placeholder="DB default"
                />
                <Field
                  label="Early bird price hold"
                  name="early_bird_hold_minutes"
                  type="number"
                  min={1}
                  placeholder="DB default"
                />
              </fieldset>
            </section>

            <div className="callout-eventuz">
              <strong className="font-semibold text-foreground">Publishing</strong>
              <p className="mt-1 text-muted-foreground">
                You can save as draft and return anytime. Set status to <em>published</em> when the
                event should be available to the registration flow.
              </p>
            </div>

            <Button type="submit" className="w-full sm:w-auto">
              Create event
            </Button>
          </form>
        </div>
      </div>
    </RoleAreaShell>
  );
}

function Field({
  label,
  name,
  type = "text",
  required,
  placeholder,
  min,
  autoComplete,
}: {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
  placeholder?: string;
  min?: number;
  autoComplete?: string;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={name} className="label-eventuz">
        {label}
        {required ? <span className="text-destructive"> *</span> : null}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        required={required}
        placeholder={placeholder}
        min={min}
        autoComplete={autoComplete}
        className="input-eventuz"
      />
    </div>
  );
}
