import { createServiceRoleClient } from "@/lib/supabase/serviceRole";
import { decryptSmtpPassword } from "@/lib/utils/crypto";
import { createSmtpTransport, formatSmtpFrom, type SmtpDecryptedConfig } from "@/lib/smtp/sendTestMessage";
import { getAppOrigin } from "@/lib/url/site";
import { brandEmailShell, emailButtonHtml, emailSecondaryButtonHtml } from "@/lib/utils/email/brandTemplates";

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

  const contentHtml = `
    <p>Dear ${escapeHtml(buyerName)},</p>
    <p>Your payment for <strong>${escapeHtml(eventName)}</strong> has been successfully processed. We are delighted to have you join us for this celebration.</p>
    
    <div style="margin:32px 0;padding:24px;background-color:#F7F4EF;border:1px solid #EDE8E3;border-radius:2px;">
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td style="font-size:11px;text-transform:uppercase;letter-spacing:0.15em;color:#7A6E68;padding-bottom:8px;">Amount Paid</td>
          <td style="font-size:11px;text-transform:uppercase;letter-spacing:0.15em;color:#7A6E68;padding-bottom:8px;text-align:right;">Order ID</td>
        </tr>
        <tr>
          <td style="font-size:20px;color:#1A1512;font-weight:300;">₱${amount}</td>
          <td style="font-size:13px;color:#1A1512;text-align:right;font-family:monospace;">${orderId.slice(0, 8)}...</td>
        </tr>
      </table>
    </div>

    <h2 style="font-family:Georgia, serif;font-size:18px;font-weight:300;margin:32px 0 16px;color:#1A1512;">Next Steps</h2>
    <p>To ensure a seamless experience on the day of the event, please complete your guest registration and seating assignments:</p>
    
    <div style="margin:32px 0;text-align:center;">
      <a href="${seatsUrl}" style="display:inline-block;background-color:#1A1512;color:#FDFAF4;padding:14px 32px;font-size:11px;font-weight:500;letter-spacing:0.2em;text-transform:uppercase;text-decoration:none;border-radius:1px;margin-bottom:12px;min-width:180px;">
        Choose Seats
      </a>
      <br />
      <a href="${ticketsUrl}" style="display:inline-block;background-color:transparent;border:1px solid #1A1512;color:#1A1512;padding:14px 32px;font-size:11px;font-weight:500;letter-spacing:0.2em;text-transform:uppercase;text-decoration:none;border-radius:1px;min-width:180px;">
        View Tickets
      </a>
    </div>

    <p style="font-size:13px;color:#7A6E68;margin-top:40px;border-top:1px solid #EDE8E3;padding-top:24px;">
      If you have any questions regarding your order, please do not hesitate to reach out to the event organizers.
    </p>
  `;

  const html = brandEmailShell({
    title: "Payment Successful",
    contentHtml
  });

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
