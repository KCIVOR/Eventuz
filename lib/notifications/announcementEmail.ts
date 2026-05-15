import { decryptSmtpPassword } from "@/lib/utils/crypto";
import {
  createSmtpTransport,
  formatSmtpFrom,
  type SmtpDecryptedConfig,
} from "@/lib/smtp/sendTestMessage";
import { createServiceRoleClient } from "@/lib/supabase/serviceRole";
import { brandEmailShell, emailButtonHtml } from "@/lib/utils/email/brandTemplates";
import { getAppOrigin } from "@/lib/url/site";

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export async function sendAnnouncementEmails(opts: {
  eventId: string;
  title: string;
  content: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const admin = createServiceRoleClient();

  // 1. Fetch Event Info
  const { data: event } = await admin
    .from("events")
    .select("name, public_slug")
    .eq("id", opts.eventId)
    .single();

  if (!event) return { ok: false, error: "Event not found." };

  // 2. Fetch SMTP Settings
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
        host: smtpRow.host,
        port: Number(smtpRow.port),
        username: smtpRow.username,
        password: decryptSmtpPassword(smtpRow.encrypted_password),
        from_email: smtpRow.from_email,
        from_name: smtpRow.from_name,
        encryption_type: smtpRow.encryption_type as any,
      };
    }
  } catch {
    cfg = null;
  }

  if (!cfg) {
    return { ok: false, error: "SMTP is not configured or inactive." };
  }

  // 3. Fetch All Recipients (Buyers + Attendees)
  // Get Buyer Emails via their Profile
  const { data: orders } = await admin
    .from("orders")
    .select("buyer_user_id")
    .eq("event_id", opts.eventId)
    .in("status", ["paid", "completed"]);

  const buyerIds = orders?.map(o => o.buyer_user_id) || [];
  const { data: buyerProfiles } = await admin
    .from("profiles")
    .select("email")
    .in("id", buyerIds);

  // Get Attendee Emails from Seat Assignments for these orders
  const { data: attendees } = await admin
    .from("seat_assignments")
    .select("attendee_email, order_id")
    .in("order_id", orders?.map(o => o.id) || []);

  const emailSet = new Set<string>();
  buyerProfiles?.forEach(b => { if (b.email) emailSet.add(b.email); });
  attendees?.forEach(a => { if (a.attendee_email) emailSet.add(a.attendee_email); });

  if (emailSet.size === 0) return { ok: true }; // No one to notify

  try {
    const transporter = createSmtpTransport(cfg);
    const from = formatSmtpFrom(cfg);
    const origin = await getAppOrigin();
    const eventUrl = `${origin}/events/${event.public_slug}`;
    
    const subject = `New Announcement: ${event.name}`;
    const en = escapeHtml(event.name);
    const annTitle = escapeHtml(opts.title);
    const annContent = opts.content.split('\n').map(l => `<p>${escapeHtml(l)}</p>`).join('');
    
    const contentHtml = `
      <p>Hello,</p>
      <p>An update has been published for <strong>${en}</strong>:</p>
      
      <div style="margin:24px 0;padding:24px;background-color:#FDFAF4;border:1px solid #EDE8E3;">
        <h2 style="margin:0 0 12px;font-family:Georgia, serif;font-size:20px;font-weight:300;">${annTitle}</h2>
        <div style="font-size:14px;color:#2E2825;line-height:1.6;">
          ${annContent}
        </div>
      </div>

      <p>You can view all announcements and event details on the dashboard:</p>

      ${emailButtonHtml("View Event Dashboard", eventUrl)}
    `;

    const html = brandEmailShell({
      title: "Event Update",
      contentHtml
    });

    // Send emails in chunks to avoid overwhelming SMTP
    const recipients = Array.from(emailSet);
    for (const email of recipients) {
      await transporter.sendMail({
        from,
        to: email,
        subject,
        text: `New Announcement for ${event.name}: ${opts.title}\n\n${opts.content}\n\nView more at: ${eventUrl}`,
        html,
      });
    }

    return { ok: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Email send failed.";
    return { ok: false, error: msg };
  }
}
