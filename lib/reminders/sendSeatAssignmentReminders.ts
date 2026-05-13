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

    const contentHtml = `
      <p>Dear ${escapeHtml(profile.full_name || "Guest")},</p>
      <p>Your payment for <strong>${escapeHtml(eventName)}</strong> has been confirmed. However, your entry passes are currently pending guest registration and seat assignments.</p>
      
      <p style="margin:24px 0;">To receive your QR codes and complete your registration, please assign a guest to each seat in your order using the link below:</p>

      ${emailButtonHtml("Choose Your Seats", seatsUrl)}

      <p style="margin:32px 0 0;font-size:13px;color:#7A6E68;line-height:1.6;">
        Please note that tickets are only generated and delivered once all seats in your order have been assigned.
      </p>
      
      <div style="margin-top:40px;padding-top:24px;border-top:1px solid #EDE8E3;font-size:11px;color:#A8A29E;font-family:monospace;">
        Order Ref: ${order.id.slice(0, 8)}...
      </div>
    `;

    const html = brandEmailShell({
      title: "Seats Still Needed",
      contentHtml
    });

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
