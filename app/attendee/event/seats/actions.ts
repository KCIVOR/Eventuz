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

  // Automatically issue tickets if the order is now completed
  const { data: ord } = await supabase
    .from("orders")
    .select("status")
    .eq("id", orderId)
    .maybeSingle();

  if (ord?.status === "completed") {
    // 1. Issue the QR tickets in the database
    const { error: issueErr } = await supabase.rpc("issue_qr_tickets_for_order", {
      p_order_id: orderId,
    });

    if (!issueErr) {
      // 2. Trigger email delivery (async)
      try {
        const { deliverTicketEmailsForOrder } = await import("@/lib/tickets/deliverTicketEmails");
        await deliverTicketEmailsForOrder(supabase, orderId, user.id);
      } catch (e) {
        console.error("[Seats Action] Failed to deliver ticket emails:", e);
      }
    }
  }

  revalidatePath("/attendee/event");
  revalidatePath("/attendee/event/seats");
  revalidatePath("/attendee/event/tickets");

  if (ord?.status === "completed") {
    redirect("/attendee/event?ticketsOk=1");
  }

  return { ok: true as const, partial: true };
}
