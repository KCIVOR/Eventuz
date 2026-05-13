import { createServiceRoleClient } from "@/lib/supabase/serviceRole";
import { decryptSmtpPassword } from "@/lib/utils/crypto";
import { createSmtpTransport, formatSmtpFrom, type SmtpDecryptedConfig } from "@/lib/smtp/sendTestMessage";
import { getAppOrigin } from "@/lib/url/site";
import { writeAuditLogSafe } from "@/lib/audit/writeAuditLog";
import { brandEmailShell, emailButtonHtml } from "@/lib/utils/email/brandTemplates";

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

    const contentHtml = `
      <p>Dear ${escapeHtml(ticket.attendee_name)},</p>
      <p>We are looking forward to welcoming you to <strong>${escapeHtml(event.name as string)}</strong>. This is a courtesy reminder of your upcoming event details.</p>
      
      <div style="margin:32px 0;padding:24px;background-color:#F7F4EF;border:1px solid #EDE8E3;border-radius:2px;">
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr><td style="padding-bottom:16px;">
            <p style="margin:0;font-size:11px;text-transform:uppercase;letter-spacing:0.15em;color:#7A6E68;">When</p>
            <p style="margin:4px 0 0;font-size:16px;color:#1A1512;font-weight:300;">${escapeHtml(when)}</p>
          </td></tr>
          <tr><td>
            <p style="margin:0;font-size:11px;text-transform:uppercase;letter-spacing:0.15em;color:#7A6E68;">Venue</p>
            <p style="margin:4px 0 0;font-size:16px;color:#1A1512;font-weight:300;">${escapeHtml(event.venue as string || "—")}</p>
          </td></tr>
        </table>
      </div>

      <p>To ensure a smooth arrival, please have your digital QR pass ready on your mobile device for check-in.</p>
      
      ${emailButtonHtml("View Ticket QR", ticketUrl)}

      <p style="margin:0;font-size:13px;color:#7A6E68;line-height:1.5;">
        We wish you a safe journey and an unforgettable experience.
      </p>
    `;

    const html = brandEmailShell({
      title: "Your Event is Soon",
      contentHtml
    });

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
