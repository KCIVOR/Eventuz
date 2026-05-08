import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PublicShell } from "@/components/layout/PublicShell";
import {
  createTicketType,
  deleteTicketType,
  updateEvent,
  updateSeat,
  updateTicketType,
} from "@/app/organizer/events/actions";
import { trimTimeForInput, toDatetimeLocalInput } from "@/lib/utils/date";

type Props = {
  params: Promise<{ eventId: string }>;
  searchParams: Promise<{ error?: string; ok?: string }>;
};

export default async function OrganizerEventDetailPage({ params, searchParams }: Props) {
  const { eventId } = await params;
  const q = await searchParams;
  const supabase = await createClient();

  const { data: event, error } = await supabase
    .from("events")
    .select("*")
    .eq("id", eventId)
    .single();

  if (error || !event) notFound();

  const { data: ticketTypes } = await supabase
    .from("ticket_types")
    .select("*")
    .eq("event_id", eventId)
    .order("created_at", { ascending: true });

  const { data: seats } = await supabase
    .from("seats")
    .select("*")
    .eq("event_id", eventId)
    .order("display_label", { ascending: true });

  const seatsByType = new Map<string, typeof seats>();
  (ticketTypes ?? []).forEach((tt) => seatsByType.set(tt.id, []));
  (seats ?? []).forEach((s) => {
    const list = seatsByType.get(s.ticket_type_id) ?? [];
    list.push(s);
    seatsByType.set(s.ticket_type_id, list);
  });

  return (
    <PublicShell>
      <div className="mx-auto w-full max-w-4xl flex-1 flex-col gap-10">
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          <Link href="/organizer" className="text-zinc-900 underline dark:text-zinc-100">
            ← Events
          </Link>
        </p>

        {q.error ? (
          <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">
            {q.error}
          </p>
        ) : null}
        {q.ok ? (
          <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-100">
            Saved.
          </p>
        ) : null}

        <section>
          <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">Event details</h1>
          <form action={updateEvent.bind(null, eventId)} className="mt-6 flex flex-col gap-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <LabeledInput label="Name" name="name" required defaultValue={event.name} />
              <LabeledInput label="Public slug" name="public_slug" required defaultValue={event.public_slug} />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-zinc-600 dark:text-zinc-400">Description</label>
              <textarea
                name="description"
                rows={3}
                defaultValue={event.description}
                className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-800"
              />
            </div>
            <LabeledInput label="Venue" name="venue" defaultValue={event.venue} />
            <div className="grid gap-4 sm:grid-cols-2">
              <LabeledInput
                label="Event date"
                name="event_date"
                type="date"
                required
                defaultValue={event.event_date}
              />
              <LabeledInput
                label="Event time"
                name="event_time"
                type="time"
                required
                defaultValue={trimTimeForInput(event.event_time)}
              />
            </div>
            <LabeledInput label="Image URL" name="image_url" type="url" defaultValue={event.image_url ?? ""} />
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-zinc-600 dark:text-zinc-400">Status</label>
              <select
                name="status"
                className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-800"
                defaultValue={event.status}
              >
                {["draft", "published", "disabled", "completed"].map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
            <fieldset className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-700">
              <legend className="px-1 text-xs font-medium text-zinc-600 dark:text-zinc-400">
                Hold durations (minutes)
              </legend>
              <div className="mt-2 grid gap-4 sm:grid-cols-3">
                <LabeledInput
                  label="Capacity hold"
                  name="capacity_hold_minutes"
                  type="number"
                  defaultValue={String(event.capacity_hold_minutes)}
                />
                <LabeledInput
                  label="Payment hold"
                  name="payment_hold_minutes"
                  type="number"
                  defaultValue={String(event.payment_hold_minutes)}
                />
                <LabeledInput
                  label="Early bird hold"
                  name="early_bird_hold_minutes"
                  type="number"
                  defaultValue={String(event.early_bird_hold_minutes)}
                />
              </div>
            </fieldset>
            <button
              type="submit"
              className="w-fit rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white dark:bg-zinc-100 dark:text-zinc-900"
            >
              Save event
            </button>
          </form>
        </section>

        <section className="border-t border-zinc-200 pt-10 dark:border-zinc-800">
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">Ticket types &amp; seats</h2>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            Each ticket type&apos;s <code className="text-xs">quantity</code> matches generated seats.
          </p>

          <form action={createTicketType.bind(null, eventId)} className="mt-6 space-y-4 rounded-xl border border-zinc-200 p-4 dark:border-zinc-800">
            <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200">Add ticket type</p>
            <div className="grid gap-3 sm:grid-cols-2">
              <LabeledInput label="Name" name="name" required />
              <LabeledInput label="Quantity (seats)" name="quantity" type="number" required defaultValue="1" />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-zinc-600 dark:text-zinc-400">Description</label>
              <textarea
                name="description"
                rows={2}
                className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-800"
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <LabeledInput label="Regular price" name="regular_price" type="number" step="0.01" required defaultValue="0" />
              <LabeledInput
                label="Early bird price"
                name="early_bird_price"
                type="number"
                step="0.01"
                required
                defaultValue="0"
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <LabeledInput label="Early bird start" name="early_bird_start_at" type="datetime-local" />
              <LabeledInput label="Early bird end" name="early_bird_end_at" type="datetime-local" />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-zinc-600 dark:text-zinc-400">Status</label>
              <select
                name="status"
                className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-800"
                defaultValue="active"
              >
                <option value="active">active</option>
                <option value="inactive">inactive</option>
                <option value="sold_out">sold_out</option>
              </select>
            </div>
            <button
              type="submit"
              className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white dark:bg-zinc-100 dark:text-zinc-900"
            >
              Add ticket type &amp; generate seats
            </button>
          </form>

          <ul className="mt-10 space-y-12">
            {(ticketTypes ?? []).map((tt) => (
              <li key={tt.id} className="rounded-xl border border-zinc-200 dark:border-zinc-800">
                <div className="border-b border-zinc-200 p-4 dark:border-zinc-800">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <p className="font-medium text-zinc-900 dark:text-zinc-50">{tt.name}</p>
                    <form action={deleteTicketType.bind(null, tt.id, eventId)}>
                      <button
                        type="submit"
                        className="text-xs font-medium text-red-600 hover:underline dark:text-red-400"
                      >
                        Delete type
                      </button>
                    </form>
                  </div>
                  <form action={updateTicketType} className="mt-4 space-y-4">
                    <input type="hidden" name="event_id" value={eventId} />
                    <input type="hidden" name="ticket_type_id" value={tt.id} />
                    <div className="grid gap-3 sm:grid-cols-2">
                      <LabeledInput label="Name" name="name" required defaultValue={tt.name} />
                      <LabeledInput label="Quantity" name="quantity" type="number" required defaultValue={String(tt.quantity)} />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-medium text-zinc-600 dark:text-zinc-400">Description</label>
                      <textarea
                        name="description"
                        rows={2}
                        defaultValue={tt.description}
                        className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-800"
                      />
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <LabeledInput
                        label="Regular price"
                        name="regular_price"
                        type="number"
                        step="0.01"
                        required
                        defaultValue={String(tt.regular_price)}
                      />
                      <LabeledInput
                        label="Early bird price"
                        name="early_bird_price"
                        type="number"
                        step="0.01"
                        required
                        defaultValue={String(tt.early_bird_price)}
                      />
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <LabeledInput
                        label="Early bird start"
                        name="early_bird_start_at"
                        type="datetime-local"
                        defaultValue={toDatetimeLocalInput(tt.early_bird_start_at)}
                      />
                      <LabeledInput
                        label="Early bird end"
                        name="early_bird_end_at"
                        type="datetime-local"
                        defaultValue={toDatetimeLocalInput(tt.early_bird_end_at)}
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-medium text-zinc-600 dark:text-zinc-400">Status</label>
                      <select
                        name="status"
                        className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-800"
                        defaultValue={tt.status}
                      >
                        <option value="active">active</option>
                        <option value="inactive">inactive</option>
                        <option value="sold_out">sold_out</option>
                      </select>
                    </div>
                    <button
                      type="submit"
                      className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white dark:bg-zinc-100 dark:text-zinc-900"
                    >
                      Update ticket type
                    </button>
                  </form>
                </div>
                <div className="overflow-x-auto p-4">
                  <table className="w-full min-w-[640px] text-left text-sm">
                    <thead>
                      <tr className="border-b border-zinc-200 text-xs text-zinc-500 dark:border-zinc-700">
                        <th className="pb-2 pr-2">Display</th>
                        <th className="pb-2 pr-2">Table</th>
                        <th className="pb-2 pr-2">Seat</th>
                        <th className="pb-2 pr-2">Status</th>
                        <th className="pb-2">Save</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(seatsByType.get(tt.id) ?? []).map((seat) => (
                        <tr key={seat.id} className="border-b border-zinc-100 dark:border-zinc-800/80">
                          <td className="py-2 pr-2 align-top">
                            <form action={updateSeat} id={`seat-${seat.id}`} className="contents">
                              <input type="hidden" name="seat_id" value={seat.id} />
                              <input type="hidden" name="event_id" value={eventId} />
                              <input
                                name="display_label"
                                defaultValue={seat.display_label}
                                className="w-full rounded border border-zinc-300 px-2 py-1 text-xs dark:border-zinc-600 dark:bg-zinc-900"
                              />
                            </form>
                          </td>
                          <td className="py-2 pr-2 align-top">
                            <input
                              form={`seat-${seat.id}`}
                              name="table_label"
                              defaultValue={seat.table_label ?? ""}
                              className="w-full rounded border border-zinc-300 px-2 py-1 text-xs dark:border-zinc-600 dark:bg-zinc-900"
                            />
                          </td>
                          <td className="py-2 pr-2 align-top">
                            <input
                              form={`seat-${seat.id}`}
                              name="seat_label"
                              defaultValue={seat.seat_label}
                              className="w-full rounded border border-zinc-300 px-2 py-1 text-xs dark:border-zinc-600 dark:bg-zinc-900"
                            />
                          </td>
                          <td className="py-2 pr-2 align-top">
                            <select
                              form={`seat-${seat.id}`}
                              name="status"
                              defaultValue={seat.status}
                              className="rounded border border-zinc-300 px-2 py-1 text-xs dark:border-zinc-600 dark:bg-zinc-900"
                            >
                              {["available", "assigned", "checked_in", "disabled"].map((s) => (
                                <option key={s} value={s}>
                                  {s}
                                </option>
                              ))}
                            </select>
                          </td>
                          <td className="py-2 align-top">
                            <button
                              type="submit"
                              form={`seat-${seat.id}`}
                              className="rounded bg-zinc-200 px-2 py-1 text-xs font-medium text-zinc-900 dark:bg-zinc-700 dark:text-zinc-100"
                            >
                              Save
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {(seatsByType.get(tt.id) ?? []).length === 0 ? (
                    <p className="text-sm text-zinc-500">No seats — quantity may be out of sync; re-save ticket type.</p>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </PublicShell>
  );
}

function LabeledInput({
  label,
  name,
  type = "text",
  required,
  defaultValue,
  step,
}: {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
  defaultValue?: string;
  step?: string;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={`${name}-${label}`} className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
        {label}
      </label>
      <input
        id={`${name}-${label}`}
        name={name}
        type={type}
        required={required}
        defaultValue={defaultValue}
        step={step}
        className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-800"
      />
    </div>
  );
}
