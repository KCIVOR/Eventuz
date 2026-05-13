import { createServiceRoleClient } from "@/lib/supabase/serviceRole";
import { decryptSmtpPassword } from "@/lib/utils/crypto";
import { createSmtpTransport, formatSmtpFrom, type SmtpDecryptedConfig } from "@/lib/smtp/sendTestMessage";
import { getAppOrigin } from "@/lib/url/site";

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export async function sendPaymentSuccessEmail(orderId: string): Promise<void> {
  const admin = createServiceRoleClient();

  // 1. Fetch order and event info
  const { data: order, error: oErr } = await admin
    .from("orders")
    .select(`
      id, 
      buyer_user_id,
      total_amount, 
      quantity,
      event:events ( name, venue, event_date, event_time )
    `)
    .eq("id", orderId)
    .single();

  if (oErr || !order) {
    console.error(`[Email] Could not find order ${orderId} for success notification:`, oErr?.message);
    return;
  }

  // 2. Fetch buyer info from profiles
  const { data: profile, error: pErr } = await admin
    .from("profiles")
    .select("email, full_name")
    .eq("id", order.buyer_user_id)
    .maybeSingle();

  if (pErr || !profile?.email) {
    console.warn(`[Email] No buyer email found for order ${orderId}:`, pErr?.message);
    return;
  }

  const buyerEmail = profile.email;
  const buyerName = profile.full_name || "Guest";

  // 2. Fetch SMTP settings
  const { data: smtpRow } = await admin
    .from("smtp_settings")
    .select("*")
    .eq("is_active", true)
    .limit(1)
    .maybeSingle();

  if (!smtpRow?.encrypted_password) {
    console.warn(`[Email] No active SMTP configured; skipping success email for ${orderId}`);
    return;
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
    console.error(`[Email] Failed to decrypt SMTP for success email:`, e);
    return;
  }

  // 3. Fetch currency from the successful payment
  const { data: payment } = await admin
    .from("payments")
    .select("currency")
    .eq("order_id", orderId)
    .eq("status", "succeeded")
    .limit(1)
    .maybeSingle();

  const origin = await getAppOrigin();
  const eventName = (order.event as any)?.name || "Event";
  const amount = Number(order.total_amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const currency = payment?.currency || "PHP"; 
  const ticketsUrl = `${origin}/attendee/event/tickets`;
  const seatsUrl = `${origin}/attendee/event/seats?order=${encodeURIComponent(orderId)}`;

  const subject = `Payment Successful — ${eventName}`;
  
  const text = [
    `Hi ${buyerName},`,
    "",
    `Your payment of ${amount} ${currency} for "${eventName}" has been successfully processed.`,
    "",
    `Order ID: ${orderId}`,
    `Quantity: ${order.quantity} ticket(s)`,
    "",
    `Next steps:`,
    `1. Choose your seats (if applicable): ${seatsUrl}`,
    `2. View and generate your QR passes: ${ticketsUrl}`,
    "",
    `Thank you for using Eventuz!`,
  ].join("\n");

  const html = `
<!DOCTYPE html>
<html>
<body style="margin:0;padding:24px;font-family:Georgia,serif;color:#1c1917;background:#faf8f5;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;margin:0 auto;background:#ffffff;border:1px solid #e7e5e4;border-radius:12px;">
    <tr><td style="padding:24px 28px;">
      <p style="margin:0 0 8px;font-size:11px;letter-spacing:0.2em;text-transform:uppercase;color:#a68a56;">Eventuz</p>
      <h1 style="margin:0 0 12px;font-size:22px;font-weight:600;">Payment Successful</h1>
      <p style="margin:0 0 20px;font-size:14px;color:#57534e;line-height:1.5;">
        Your payment for <strong>${escapeHtml(eventName)}</strong> was received.
      </p>
      
      <div style="margin:24px 0;padding:20px;background:#faf8f5;border-radius:8px;border:1px solid #e7e5e4;">
        <table width="100%">
          <tr>
            <td style="font-size:13px;color:#78716c;padding-bottom:4px;">Amount Paid</td>
            <td style="font-size:13px;color:#78716c;padding-bottom:4px;text-align:right;">Order ID</td>
          </tr>
          <tr>
            <td style="font-size:18px;font-weight:600;color:#1c1917;">${amount} ${currency}</td>
            <td style="font-size:13px;font-family:monospace;color:#1c1917;text-align:right;">${orderId.slice(0, 8)}...</td>
          </tr>
        </table>
      </div>

      <h2 style="margin:24px 0 12px;font-size:16px;font-weight:600;">Next Steps</h2>
      <p style="margin:0 0 16px;font-size:14px;color:#57534e;line-height:1.5;">
        To get your entry passes, you need to assign seats for your guests and generate the QR codes:
      </p>
      
      <p style="margin:0 0 24px;">
        <a href="${escapeHtml(seatsUrl)}" style="display:inline-block;border-radius:12px;background:#722f37;color:#faf8f5;font-size:14px;font-weight:600;padding:12px 22px;text-decoration:none;margin-right:8px;">
          Choose Seats
        </a>
        <a href="${escapeHtml(ticketsUrl)}" style="display:inline-block;border-radius:12px;border:1px solid #e7e5e4;background:#ffffff;color:#1c1917;font-size:14px;font-weight:600;padding:12px 22px;text-decoration:none;">
          View Tickets
        </a>
      </p>

      <p style="margin:0;font-size:13px;color:#78716c;line-height:1.5;">
        If you have any questions, please contact the event organizer.
      </p>
    </td></tr>
  </table>
</body>
</html>`;

  try {
    const transporter = createSmtpTransport(cfg);
    const from = formatSmtpFrom(cfg);
    await transporter.sendMail({
      from,
      to: buyerEmail,
      subject,
      text,
      html,
    });
    console.log(`[Email] Payment success email sent to ${buyerEmail} for order ${orderId}`);
  } catch (e) {
    console.error(`[Email] Failed to send payment success email for order ${orderId}:`, e);
  }
}
