import type { SupabaseClient } from "@supabase/supabase-js";
import { writeAuditLogSafe } from "@/lib/audit/writeAuditLog";
import { decryptSmtpPassword } from "@/lib/utils/crypto";
import { createSmtpTransport, formatSmtpFrom, type SmtpDecryptedConfig } from "@/lib/smtp/sendTestMessage";
import { createServiceRoleClient } from "@/lib/supabase/serviceRole";
import { getAppOrigin } from "@/lib/url/site";
import { eventTicketQrDataUrl, eventTicketQrPayload } from "@/lib/tickets/eventTicketQr";
import { brandEmailShell, emailButtonHtml } from "@/lib/utils/email/brandTemplates";

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
      `Open your pass in Eventuz:`,
      ticketPageUrl,
      ``,
      `Your QR code is attached as an image. Present it at check-in.`,
    ].join("\n");

    const contentHtml = `
      <p>Dear ${escapeHtml(t.attendee_name)},</p>
      <p>We are pleased to provide your entry pass for <strong>${escapeHtml(eventName)}</strong>. Please find your event details and QR code below.</p>
      
      <div style="margin:32px 0;padding:24px;background-color:#F7F4EF;border:1px solid #EDE8E3;border-radius:2px;">
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr><td style="padding-bottom:16px;">
            <p style="margin:0;font-size:11px;text-transform:uppercase;letter-spacing:0.15em;color:#7A6E68;">Ticket Type</p>
            <p style="margin:4px 0 0;font-size:16px;color:#1A1512;font-weight:300;">${escapeHtml(ticketType)}</p>
          </td></tr>
          <tr><td style="padding-bottom:16px;">
            <p style="margin:0;font-size:11px;text-transform:uppercase;letter-spacing:0.15em;color:#7A6E68;">When</p>
            <p style="margin:4px 0 0;font-size:16px;color:#1A1512;font-weight:300;">${escapeHtml(when)}</p>
          </td></tr>
          <tr><td style="padding-bottom:16px;">
            <p style="margin:0;font-size:11px;text-transform:uppercase;letter-spacing:0.15em;color:#7A6E68;">Venue</p>
            <p style="margin:4px 0 0;font-size:16px;color:#1A1512;font-weight:300;">${escapeHtml(venue)}</p>
          </td></tr>
          <tr><td style="padding-bottom:16px;">
            <p style="margin:0;font-size:11px;text-transform:uppercase;letter-spacing:0.15em;color:#7A6E68;">Seat Assignment</p>
            <p style="margin:4px 0 0;font-size:16px;color:#1A1512;font-weight:300;">${escapeHtml(seatLabel)}</p>
          </td></tr>
          <tr><td>
            <p style="margin:0;font-size:11px;text-transform:uppercase;letter-spacing:0.15em;color:#7A6E68;">Ticket Code</p>
            <p style="margin:4px 0 0;font-size:13px;color:#1A1512;font-family:monospace;">${escapeHtml(t.ticket_code)}</p>
          </td></tr>
        </table>
      </div>

      <div style="margin:40px 0;text-align:center;">
        <p style="font-size:11px;text-transform:uppercase;letter-spacing:0.2em;color:#C9A96E;margin-bottom:20px;">Your Entry Pass</p>
        <div style="display:inline-block;padding:12px;background-color:#ffffff;border:1px solid #EDE8E3;border-radius:2px;">
          <img src="cid:ticketqr" width="280" height="280" alt="Ticket QR code" style="display:block;" />
        </div>
        <p style="margin-top:20px;font-size:13px;color:#7A6E68;font-style:italic;">Please present this code at check-in.</p>
      </div>

      <div style="text-align:center;margin-top:40px;">
        <a href="${ticketPageUrl}" style="display:inline-block;background-color:#1A1512;color:#FDFAF4;padding:14px 32px;font-size:11px;font-weight:500;letter-spacing:0.2em;text-transform:uppercase;text-decoration:none;border-radius:1px;">
          Digital Ticket Hub
        </a>
      </div>

      <p style="font-size:12px;color:#7A6E68;margin-top:48px;border-top:1px solid #EDE8E3;padding-top:24px;line-height:1.6;">
        For the best experience, you can access your ticket digitally by signing into your account.
      </p>
    `;

    const html = brandEmailShell({
      title: "Your Ticket",
      contentHtml
    });

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
