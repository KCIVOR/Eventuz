import { createServiceRoleClient } from "@/lib/supabase/serviceRole";
import { decryptSmtpPassword } from "@/lib/utils/crypto";
import { createSmtpTransport, formatSmtpFrom, type SmtpDecryptedConfig } from "@/lib/smtp/sendTestMessage";
import { getAppOrigin } from "@/lib/url/site";
import { writeAuditLogSafe } from "@/lib/audit/writeAuditLog";

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export async function processPreEventReminders(): Promise<{ sent: number; skipped: number }> {
  const admin = createServiceRoleClient();
  const origin = await getAppOrigin();

  // 1. Calculate the date range (e.g., events occurring tomorrow and the day after)
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const dayAfter = new Date();
  dayAfter.setDate(dayAfter.getDate() + 2);

  const tomorrowStr = tomorrow.toISOString().split("T")[0];
  const dayAfterStr = dayAfter.toISOString().split("T")[0];

  // 2. Find events in this range
  const { data: events, error: evErr } = await admin
    .from("events")
    .select("id, name, venue, event_date, event_time")
    .gte("event_date", tomorrowStr)
    .lte("event_date", dayAfterStr)
    .eq("status", "published");

  if (evErr || !events?.length) {
    if (evErr) console.error("[Event Reminders] Error fetching events:", evErr.message);
    return { sent: 0, skipped: 0 };
  }

  // 3. Fetch SMTP config
  const { data: smtpRow } = await admin
    .from("smtp_settings")
    .select("*")
    .eq("is_active", true)
    .limit(1)
    .maybeSingle();

  if (!smtpRow?.encrypted_password) {
    console.warn("[Event Reminders] No active SMTP found.");
    return { sent: 0, skipped: 0 };
  }

  let cfg: SmtpDecryptedConfig;
  try {
    cfg = {
      host: smtpRow.host as string,
      port: Number(smtpRow.port),
      username: smtpRow.username as string,
      password: decryptSmtpPassword(smtpRow.encrypted_password as string),
      from_email: smtpRow.from_email as string,
      from_name: smtpRow.from_name as string,
      encryption_type: smtpRow.encryption_type as SmtpDecryptedConfig["encryption_type"],
    };
  } catch (e) {
    console.error("[Event Reminders] SMTP decryption failed:", e);
    return { sent: 0, skipped: 0 };
  }

  const transporter = createSmtpTransport(cfg);
  const from = formatSmtpFrom(cfg);
  let sentCount = 0;
  let skippedCount = 0;

  for (const event of events) {
    // 4. Find all issued tickets for this event
    const { data: tickets } = await admin
      .from("tickets")
      .select("id, attendee_name, attendee_email, ticket_code")
      .eq("event_id", event.id)
      .eq("status", "issued");

    if (!tickets?.length) continue;

    for (const ticket of tickets) {
      // 5. Check if we already sent a reminder for this SPECIFIC ticket
      const { data: logs } = await admin
        .from("audit_logs")
        .select("id")
        .eq("action", "ticket.event_reminder_sent")
        .eq("entity_id", ticket.id)
        .limit(1);

      if (logs?.length) {
        skippedCount++;
        continue;
      }

      // 6. Send Email
      const when = `${event.event_date} · ${String(event.event_time).slice(0, 5)}`;
      const ticketUrl = `${origin}/attendee/event/tickets/${ticket.id}`;
      const subject = `Reminder: ${event.name} is coming up soon!`;

      const text = [
        `Hi ${ticket.attendee_name},`,
        "",
        `We're excited to see you at "${event.name}"!`,
        "",
        `When: ${when}`,
        `Venue: ${event.venue || "—"}`,
        "",
        `Please have your QR code ready for check-in. You can view your ticket and QR code here:`,
        ticketUrl,
        "",
        `See you there!`,
        `The Eventuz Team`,
      ].join("\n");

      const html = `
<!DOCTYPE html>
<html>
<body style="margin:0;padding:24px;font-family:Georgia,serif;color:#1c1917;background:#faf8f5;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;margin:0 auto;background:#ffffff;border:1px solid #e7e5e4;border-radius:12px;">
    <tr><td style="padding:24px 28px;">
      <p style="margin:0 0 8px;font-size:11px;letter-spacing:0.2em;text-transform:uppercase;color:#a68a56;">Eventuz</p>
      <h1 style="margin:0 0-12px;font-size:22px;font-weight:600;">Your Event is Soon</h1>
      <p style="margin:0 0 20px;font-size:14px;color:#57534e;line-height:1.5;">
        We're looking forward to seeing you at <strong>${escapeHtml(event.name as string)}</strong>.
      </p>
      
      <div style="margin:24px 0;padding:20px;background:#faf8f5;border-radius:8px;border:1px solid #e7e5e4;">
        <p style="margin:0 0 4px;font-size:13px;color:#78716c;">When</p>
        <p style="margin:0 0 16px;font-size:15px;font-weight:600;color:#1c1917;">${escapeHtml(when)}</p>
        <p style="margin:0 0 4px;font-size:13px;color:#78716c;">Venue</p>
        <p style="margin:0;font-size:15px;font-weight:600;color:#1c1917;">${escapeHtml(event.venue as string || "—")}</p>
      </div>

      <p style="margin:0 0 16px;font-size:14px;color:#57534e;line-height:1.5;">
        To ensure a smooth check-in, please have your QR code ready on your phone when you arrive.
      </p>
      
      <p style="margin:0 0 24px;">
        <a href="${escapeHtml(ticketUrl)}" style="display:inline-block;border-radius:12px;background:#722f37;color:#faf8f5;font-size:14px;font-weight:600;padding:12px 22px;text-decoration:none;">
          View Your Ticket QR
        </a>
      </p>

      <p style="margin:0;font-size:13px;color:#78716c;line-height:1.5;">
        Safe travels!
      </p>
    </td></tr>
  </table>
</body>
</html>`;

      try {
        await transporter.sendMail({ from, to: ticket.attendee_email, subject, text, html });
        
        await writeAuditLogSafe(admin, {
          action: "ticket.event_reminder_sent",
          entityType: "ticket",
          entityId: ticket.id,
          metadata: { email: ticket.attendee_email, event_id: event.id }
        });
        
        sentCount++;
      } catch (e) {
        console.error(`[Event Reminders] Failed to send to ${ticket.attendee_email}:`, e);
        skippedCount++;
      }
    }
  }

  return { sent: sentCount, skipped: skippedCount };
}
