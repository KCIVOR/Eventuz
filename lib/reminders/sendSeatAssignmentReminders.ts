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

export async function processSeatAssignmentReminders(): Promise<{ sent: number; skipped: number }> {
  const admin = createServiceRoleClient();
  const origin = await getAppOrigin();

  // 1. Fetch orders needing seat assignment
  const { data: orders, error: oErr } = await admin
    .from("orders")
    .select(`
      id,
      buyer_user_id,
      quantity,
      status,
      created_at,
      event:events ( name )
    `)
    .in("status", ["paid_unassigned", "partially_assigned"]);

  if (oErr) {
    console.error("[Reminders] Failed to fetch orders:", oErr.message);
    return { sent: 0, skipped: 0 };
  }

  if (!orders?.length) return { sent: 0, skipped: 0 };

  // 2. Fetch SMTP config once
  const { data: smtpRow } = await admin
    .from("smtp_settings")
    .select("*")
    .eq("is_active", true)
    .limit(1)
    .maybeSingle();

  if (!smtpRow?.encrypted_password) {
    console.warn("[Reminders] No active SMTP found; skipping.");
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
    console.error("[Reminders] SMTP decryption failed:", e);
    return { sent: 0, skipped: 0 };
  }

  const transporter = createSmtpTransport(cfg);
  const from = formatSmtpFrom(cfg);
  let sentCount = 0;
  let skippedCount = 0;

  for (const order of orders) {
    // 3. Check if we already sent a reminder for this order
    const { data: logs } = await admin
      .from("audit_logs")
      .select("id")
      .eq("action", "order.seat_reminder_sent")
      .eq("entity_id", order.id)
      .limit(1);

    if (logs?.length) {
      skippedCount++;
      continue;
    }

    // 4. Fetch buyer profile
    const { data: profile } = await admin
      .from("profiles")
      .select("email, full_name")
      .eq("id", order.buyer_user_id)
      .maybeSingle();

    if (!profile?.email) {
      skippedCount++;
      continue;
    }

    // 5. Send Email
    const eventName = (order.event as any)?.name || "Event";
    const seatsUrl = `${origin}/attendee/event/seats?order=${encodeURIComponent(order.id)}`;
    const subject = `Action Required: Choose your seats for ${eventName}`;

    const text = [
      `Hi ${profile.full_name || "Guest"},`,
      "",
      `Your payment for "${eventName}" is confirmed, but your tickets haven't been issued yet because seats haven't been assigned.`,
      "",
      `To get your QR passes, please choose your seats here:`,
      seatsUrl,
      "",
      `Each guest needs a seat assignment before their individual ticket can be generated.`,
      "",
      `Thank you,`,
      `The Eventuz Team`,
    ].join("\n");

    const html = `
<!DOCTYPE html>
<html>
<body style="margin:0;padding:24px;font-family:Georgia,serif;color:#1c1917;background:#faf8f5;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;margin:0 auto;background:#ffffff;border:1px solid #e7e5e4;border-radius:12px;">
    <tr><td style="padding:24px 28px;">
      <p style="margin:0 0 8px;font-size:11px;letter-spacing:0.2em;text-transform:uppercase;color:#a68a56;">Eventuz</p>
      <h1 style="margin:0 0 12px;font-size:22px;font-weight:600;">Seats Still Needed</h1>
      <p style="margin:0 0 20px;font-size:14px;color:#57534e;line-height:1.5;">
        You've successfully paid for <strong>${escapeHtml(eventName)}</strong>, but your QR passes are waiting for seat assignments.
      </p>
      
      <p style="margin:24px 0;">
        <a href="${escapeHtml(seatsUrl)}" style="display:inline-block;border-radius:12px;background:#722f37;color:#faf8f5;font-size:14px;font-weight:600;padding:12px 22px;text-decoration:none;">
          Choose Your Seats Now
        </a>
      </p>

      <p style="margin:0 0 16px;font-size:13px;color:#57534e;line-height:1.5;">
        Tickets are only generated once every seat in your order has been assigned to a guest.
      </p>
      
      <hr style="border:none;border-top:1px solid #e7e5e4;margin:24px 0;" />
      <p style="margin:0;font-size:12px;color:#a8a29e;">
        Order ID: ${order.id.slice(0, 8)}...
      </p>
    </td></tr>
  </table>
</body>
</html>`;

    try {
      await transporter.sendMail({ from, to: profile.email, subject, text, html });
      
      // 6. Log success to prevent double-sending
      await writeAuditLogSafe(admin, {
        action: "order.seat_reminder_sent",
        entityType: "order",
        entityId: order.id,
        metadata: { buyer_email: profile.email }
      });
      
      sentCount++;
    } catch (e) {
      console.error(`[Reminders] Failed to send to ${profile.email}:`, e);
      skippedCount++;
    }
  }

  return { sent: sentCount, skipped: skippedCount };
}
