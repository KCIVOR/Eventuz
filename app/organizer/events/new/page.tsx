import { PublicShell } from "@/components/layout/PublicShell";
import Link from "next/link";
import { createEvent } from "@/app/organizer/events/actions";

type Props = {
  searchParams: Promise<{ error?: string }>;
};

export default async function NewEventPage({ searchParams }: Props) {
  const q = await searchParams;
  return (
    <PublicShell>
      <div className="mx-auto w-full max-w-xl flex-1 flex-col">
        <p className="mb-6 text-sm text-zinc-600 dark:text-zinc-400">
          <Link href="/organizer" className="text-zinc-900 underline dark:text-zinc-100">
            ← Back to events
          </Link>
        </p>
        <h1 className="mb-8 text-2xl font-semibold text-zinc-900 dark:text-zinc-50">New event</h1>
        {q.error ? (
          <p className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">
            {q.error}
          </p>
        ) : null}
        <form action={createEvent} className="flex flex-col gap-5">
          <Field label="Name" name="name" required />
          <Field label="Public URL slug" name="public_slug" placeholder="auto from name if empty" />
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-zinc-600 dark:text-zinc-400">Description</label>
            <textarea
              name="description"
              rows={3}
              className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-800"
            />
          </div>
          <Field label="Venue" name="venue" />
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Event date" name="event_date" type="date" required />
            <Field label="Event time" name="event_time" type="time" required />
          </div>
          <Field label="Image URL (optional)" name="image_url" type="url" placeholder="https://…" />
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-zinc-600 dark:text-zinc-400">Status</label>
            <select
              name="status"
              className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-800"
              defaultValue="draft"
            >
              <option value="draft">draft</option>
              <option value="published">published</option>
              <option value="disabled">disabled</option>
              <option value="completed">completed</option>
            </select>
          </div>
          <fieldset className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-700">
            <legend className="px-1 text-xs font-medium text-zinc-600 dark:text-zinc-400">
              Hold durations (minutes)
            </legend>
            <div className="mt-2 grid gap-4 sm:grid-cols-3">
              <Field label="Capacity hold" name="capacity_hold_minutes" type="number" defaultValue="15" />
              <Field label="Payment hold" name="payment_hold_minutes" type="number" defaultValue="15" />
              <Field label="Early bird hold" name="early_bird_hold_minutes" type="number" defaultValue="15" />
            </div>
          </fieldset>
          <button
            type="submit"
            className="rounded-lg bg-zinc-900 py-2.5 text-sm font-medium text-white dark:bg-zinc-100 dark:text-zinc-900"
          >
            Create event
          </button>
        </form>
      </div>
    </PublicShell>
  );
}

function Field({
  label,
  name,
  type = "text",
  required,
  placeholder,
  defaultValue,
}: {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
  placeholder?: string;
  defaultValue?: string;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={name} className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
        {label}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        required={required}
        placeholder={placeholder}
        defaultValue={defaultValue}
        className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-800"
      />
    </div>
  );
}
