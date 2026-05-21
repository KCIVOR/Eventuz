"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export type SeatAssignmentRow = {
  seat_id: string;
  attendee_name: string;
  attendee_email?: string;
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

  const { data: profile } = await supabase
    .from("profiles")
    .select("email")
    .eq("id", user.id)
    .maybeSingle();

  const buyerEmail = (user.email || (profile?.email as string | null) || "").trim().toLowerCase();
  if (!buyerEmail) {
    return { error: "Your account email could not be found. Add an email before assigning seats." } as const;
  }

  const basicEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const normalizedRows = rows.map((row) => {
    const attendeeEmail = (row.attendee_email ?? "").trim().toLowerCase();
    return {
      ...row,
      attendee_name: row.attendee_name.trim(),
      attendee_email: attendeeEmail || buyerEmail,
    };
  });

  for (const row of normalizedRows) {
    if (!row.seat_id || !row.attendee_name) {
      return { error: "Every selected seat needs an attendee name." } as const;
    }
    if (!basicEmail.test(row.attendee_email)) {
      return { error: "Enter a valid attendee email, or leave it blank to use the buyer email." } as const;
    }
  }

  const { error } = await supabase.rpc("submit_order_seat_assignments", {
    p_order_id: orderId,
    p_assignments: normalizedRows,
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
    redirect("/attendee/event/tickets");
  }

  return { ok: true as const, partial: true };
}
