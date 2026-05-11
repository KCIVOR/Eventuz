"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export type SeatAssignmentRow = {
  seat_id: string;
  attendee_name: string;
  attendee_email: string;
};

export type SubmitSeatAssignmentsResult =
  | { error: string }
  | { ok: true; partial: true };

export async function submitSeatAssignments(
  orderId: string,
  rows: SeatAssignmentRow[]
): Promise<SubmitSeatAssignmentsResult | void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/attendee/event/seats");
  }

  const { error } = await supabase.rpc("submit_order_seat_assignments", {
    p_order_id: orderId,
    p_assignments: rows,
  });

  if (error) {
    return { error: error.message } as const;
  }

  revalidatePath("/attendee/event");
  revalidatePath("/attendee/event/seats");
  revalidatePath("/attendee/event/tickets");

  const { data: ord } = await supabase
    .from("orders")
    .select("status")
    .eq("id", orderId)
    .maybeSingle();

  if ((ord?.status as string | undefined) === "completed") {
    redirect("/attendee/event?seats=done");
  }

  return { ok: true as const, partial: true };
}
