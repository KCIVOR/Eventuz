import { decryptSmtpPassword } from "@/lib/utils/crypto";
import {
  createSmtpTransport,
  formatSmtpFrom,
  type SmtpDecryptedConfig,
} from "@/lib/smtp/sendTestMessage";
import { createServiceRoleClient } from "@/lib/supabase/serviceRole";

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export async function sendStaffInviteEmail(opts: {
  to: string;
  eventName: string;
  acceptUrl: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
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

  if (!cfg) {
    return { ok: false, error: "SMTP is not configured or inactive." };
  }

  try {
    const transporter = createSmtpTransport(cfg);
    const from = formatSmtpFrom(cfg);
    const subject = `Staff check-in access · ${opts.eventName.replace(/\s+/g, " ").trim()}`;
    const text = [
      `You’ve been invited to help scan tickets (scanner) for: ${opts.eventName}.`,
      "",
      "Open this link to accept the invitation. Sign in or create an account using the same email address this message was sent to:",
      opts.acceptUrl,
      "",
      "If you didn’t expect this, you can ignore this email.",
    ].join("\n");

    const en = escapeHtml(opts.eventName);
    const url = escapeHtml(opts.acceptUrl);
    const html = `<!DOCTYPE html>
<html>
<body style="margin:0;padding:24px;font-family:Georgia,serif;color:#1c1917;background:#faf8f5;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;margin:0 auto;background:#ffffff;border:1px solid #e7e5e4;border-radius:12px;">
    <tr><td style="padding:24px 28px;">
      <p style="margin:0 0 8px;font-size:11px;letter-spacing:0.2em;text-transform:uppercase;color:#a68a56;">Eventuz</p>
      <h1 style="margin:0 0 12px;font-size:22px;font-weight:600;">Staff invitation</h1>
      <p style="margin:0 0 20px;font-size:14px;color:#57534e;line-height:1.5;">
        You’ve been invited to help with <strong>QR check-in</strong> for <strong>${en}</strong>.
      </p>
      <p style="margin:0 0 16px;font-size:14px;color:#57534e;line-height:1.5;">
        Use the same email this invitation was sent to when you sign in or register.
      </p>
      <p style="margin:0 0 24px;text-align:center;">
        <a href="${url}" style="display:inline-block;border-radius:12px;background:#722f37;color:#faf8f5;font-size:14px;font-weight:600;padding:12px 22px;text-decoration:none;">
          Accept invitation
        </a>
      </p>
      <p style="margin:0;font-size:12px;color:#78716c;line-height:1.5;word-break:break-all;">
        If the button doesn’t work, copy this link:<br/><a href="${url}" style="color:#722f37;">${url}</a>
      </p>
    </td></tr>
  </table>
</body>
</html>`;

    await transporter.sendMail({
      from,
      to: opts.to,
      subject,
      text,
      html,
    });
    return { ok: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Send failed.";
    return { ok: false, error: msg };
  }
}
