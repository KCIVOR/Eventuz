import type { SupabaseClient } from "@supabase/supabase-js";
import { writeAuditLogSafe } from "@/lib/audit/writeAuditLog";
import { decryptSmtpPassword } from "@/lib/utils/crypto";
import { createSmtpTransport, formatSmtpFrom, type SmtpDecryptedConfig } from "@/lib/smtp/sendTestMessage";
import { createServiceRoleClient } from "@/lib/supabase/serviceRole";
import { getAppOrigin } from "@/lib/url/site";
import { eventTicketQrDataUrl, eventTicketQrPayload } from "@/lib/tickets/eventTicketQr";

type UserSupabase = SupabaseClient;

function one<T>(x: T | T[] | null | undefined): T | null {
  if (x == null) return null;
  return Array.isArray(x) ? (x[0] ?? null) : x;
}

type TicketRow = {
  id: string;
  attendee_name: string;
  attendee_email: string;
  ticket_code: string;
  emailed_at: string | null;
  status: string;
  events: {
    name: string;
    venue: string;
    event_date: string;
    event_time: string;
  } | null;
  seats: { display_label: string; seat_label: string; table_label: string | null } | null;
  ticket_types: { name: string } | null;
};

function seatDescription(seat: TicketRow["seats"]): string {
  if (!seat) return "—";
  const table =
    seat.table_label != null && seat.table_label !== "" ? `Table ${seat.table_label}` : null;
  const sl = seat.seat_label ? `Seat ${seat.seat_label}` : null;
  const parts = [table, sl].filter(Boolean);
  const extra = parts.length ? ` (${parts.join(" · ")})` : "";
  return `${seat.display_label}${extra}`;
}

async function markTicketEmail(
  admin: ReturnType<typeof createServiceRoleClient>,
  ticketId: string,
  ok: boolean,
  errorMessage: string | null
) {
  const now = new Date().toISOString();
  if (ok) {
    await admin
      .from("tickets")
      .update({ emailed_at: now, email_last_error: null })
      .eq("id", ticketId);
  } else {
    await admin.from("tickets").update({ email_last_error: errorMessage }).eq("id", ticketId);
  }
}

/**
 * Sends one email per ticket (to ticket.attendee_email) using active Super Admin SMTP.
 * Skips tickets that already have emailed_at. Uses service role for SMTP read + ticket patches.
 * Caller must pass the buyer's Supabase session (for RPC + order ownership).
 */
export async function deliverTicketEmailsForOrder(
  userSupabase: UserSupabase,
  orderId: string,
  buyerUserId: string
): Promise<void> {
  const { data: order, error: orderErr } = await userSupabase
    .from("orders")
    .select("id")
    .eq("id", orderId)
    .eq("buyer_user_id", buyerUserId)
    .maybeSingle();

  if (orderErr || !order) {
    return;
  }

  const admin = createServiceRoleClient();

  const { data: smtpRow } = await admin
    .from("smtp_settings")
    .select("*")
    .eq("is_active", true)
    .limit(1)
    .maybeSingle();

  let cfg: SmtpDecryptedConfig | null = null;
  try {
    if (smtpRow?.encrypted_password) {
      cfg = {
        host: smtpRow.host as string,
        port: Number(smtpRow.port),
        username: smtpRow.username as string,
        password: decryptSmtpPassword(smtpRow.encrypted_password as string),
        from_email: smtpRow.from_email as string,
        from_name: smtpRow.from_name as string,
        encryption_type: smtpRow.encryption_type as SmtpDecryptedConfig["encryption_type"],
      };
    }
  } catch {
    cfg = null;
  }

  const { data: rawTickets, error: tErr } = await userSupabase
    .from("tickets")
    .select(
      `id, attendee_name, attendee_email, ticket_code, emailed_at, status,
       events ( name, venue, event_date, event_time ),
       seats ( display_label, seat_label, table_label ),
       ticket_types ( name )`
    )
    .eq("order_id", orderId)
    .eq("status", "issued")
    .order("issued_at", { ascending: true });

  if (tErr || !rawTickets?.length) {
    return;
  }

  const tickets: TicketRow[] = rawTickets.map((r) => ({
    id: r.id as string,
    attendee_name: r.attendee_name as string,
    attendee_email: r.attendee_email as string,
    ticket_code: r.ticket_code as string,
    emailed_at: r.emailed_at ? String(r.emailed_at) : null,
    status: r.status as string,
    events: one(r.events as TicketRow["events"] | TicketRow["events"][]),
    seats: one(r.seats as TicketRow["seats"] | TicketRow["seats"][]),
    ticket_types: one(r.ticket_types as TicketRow["ticket_types"] | TicketRow["ticket_types"][]),
  }));

  const noSmtpMsg = cfg
    ? null
    : "Email not sent: active SMTP is not configured or the saved password could not be decrypted.";

  const origin = await getAppOrigin();
  const transporter = cfg ? createSmtpTransport(cfg) : null;
  const from = cfg ? formatSmtpFrom(cfg) : "";

  for (const t of tickets) {
    if (t.emailed_at) {
      continue;
    }

    if (!cfg || !transporter) {
      await markTicketEmail(admin, t.id, false, noSmtpMsg);
      continue;
    }

    const { data: signedPayload, error: rpcErr } = await userSupabase.rpc("ticket_qr_payload", {
      p_ticket_id: t.id,
    });
    if (rpcErr || typeof signedPayload !== "string" || !signedPayload.length) {
      await markTicketEmail(
        admin,
        t.id,
        false,
        `Could not build QR for this ticket: ${rpcErr?.message ?? "unknown error"}.`
      );
      continue;
    }

    const fullQrString = eventTicketQrPayload(signedPayload);
    const qrDataUrl = await eventTicketQrDataUrl(signedPayload);
    const b64 = qrDataUrl.split(",")[1];
    const qrBuffer = Buffer.from(b64 ?? "", "base64");

    const ev = t.events;
    const eventName = ev?.name ?? "Event";
    const venue = ev?.venue?.trim() || "—";
    const when =
      ev?.event_date && ev?.event_time
        ? `${ev.event_date} · ${String(ev.event_time).slice(0, 5)}`
        : ev?.event_date ?? "—";
    const ticketType = t.ticket_types?.name ?? "Ticket";
    const seatLabel = seatDescription(t.seats);

    const ticketPageUrl = `${origin}/attendee/event/tickets/${t.id}`;
    const subject = `Your ticket — ${eventName} — ${t.ticket_code}`;

    const text = [
      `Hi ${t.attendee_name},`,
      ``,
      `Here is your ticket for ${eventName}.`,
      ``,
      `When: ${when}`,
      `Venue: ${venue}`,
      `Ticket type: ${ticketType}`,
      `Seat: ${seatLabel}`,
      `Ticket code: ${t.ticket_code}`,
      ``,
      `Open your pass in Eventuz (sign in with the account that purchased the tickets):`,
      ticketPageUrl,
      ``,
      `Your QR code is attached as an image. Present it at check-in.`,
      ``,
      fullQrString,
    ].join("\n");

    const html = `
<!DOCTYPE html>
<html>
<body style="margin:0;padding:24px;font-family:Georgia,serif;color:#1c1917;background:#faf8f5;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;margin:0 auto;background:#ffffff;border:1px solid #e7e5e4;border-radius:12px;">
    <tr><td style="padding:24px 28px;">
      <p style="margin:0 0 8px;font-size:11px;letter-spacing:0.2em;text-transform:uppercase;color:#a68a56;">Eventuz</p>
      <h1 style="margin:0 0 12px;font-size:22px;font-weight:600;">${escapeHtml(eventName)}</h1>
      <p style="margin:0 0 20px;font-size:14px;color:#57534e;">Your ticket · ${escapeHtml(ticketType)}</p>
      <p style="margin:0 0 6px;font-size:14px;"><strong>Guest</strong><br/>${escapeHtml(t.attendee_name)}</p>
      <p style="margin:16px 0 6px;font-size:14px;"><strong>When</strong><br/>${escapeHtml(when)}</p>
      <p style="margin:16px 0 6px;font-size:14px;"><strong>Venue</strong><br/>${escapeHtml(venue)}</p>
      <p style="margin:16px 0 6px;font-size:14px;"><strong>Seat</strong><br/>${escapeHtml(seatLabel)}</p>
      <p style="margin:16px 0 6px;font-size:14px;"><strong>Ticket code</strong><br/><span style="font-family:ui-monospace,monospace;">${escapeHtml(t.ticket_code)}</span></p>
      <div style="margin:24px 0;text-align:center;">
        <img src="cid:ticketqr" width="280" height="280" alt="Ticket QR code" style="border:1px solid #e7e5e4;border-radius:12px;background:#faf8f5;padding:8px;" />
      </div>
      <p style="margin:16px 0;font-size:13px;color:#57534e;line-height:1.5;">
        Show this QR at check-in. If you use Eventuz, the buyer can also open this pass while signed in:
        <a href="${escapeHtml(ticketPageUrl)}" style="color:#722f37;">View ticket</a>
      </p>
    </td></tr>
  </table>
</body>
</html>`;

    try {
      await transporter.sendMail({
        from,
        to: t.attendee_email,
        subject,
        text,
        html,
        attachments: [
          {
            filename: "ticket-qr.png",
            content: qrBuffer,
            cid: "ticketqr",
            contentType: "image/png",
          },
        ],
      });
      await markTicketEmail(admin, t.id, true, null);
      await writeAuditLogSafe(userSupabase, {
        action: "ticket.email_sent",
        entityType: "ticket",
        entityId: t.id,
        metadata: { order_id: orderId },
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Send failed.";
      await markTicketEmail(admin, t.id, false, msg);
    }
  }
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
