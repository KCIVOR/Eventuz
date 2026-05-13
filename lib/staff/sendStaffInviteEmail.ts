import { decryptSmtpPassword } from "@/lib/utils/crypto";
import {
  createSmtpTransport,
  formatSmtpFrom,
  type SmtpDecryptedConfig,
} from "@/lib/smtp/sendTestMessage";
import { createServiceRoleClient } from "@/lib/supabase/serviceRole";
import { brandEmailShell, emailButtonHtml } from "@/lib/utils/email/brandTemplates";

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
    const subject = `Staff invitation · ${opts.eventName.replace(/\s+/g, " ").trim()}`;
    const text = [
      `Hi,`,
      ``,
      `You’ve been invited to help with QR check-in for: ${opts.eventName}.`,
      "",
      "Use this link to accept the invitation and gain access to the scanner:",
      opts.acceptUrl,
      "",
      "Please sign in or create an account using the same email address this message was sent to.",
    ].join("\n");

    const en = escapeHtml(opts.eventName);
    const url = escapeHtml(opts.acceptUrl);
    
    const contentHtml = `
      <p>Hello,</p>
      <p>You have been personally invited to join the event staff for <strong>${en}</strong>. You will be responsible for <strong>QR ticket check-in</strong> using the Eventuz scanner tools.</p>
      
      <p style="margin:24px 0;">To gain access to the organizer dashboard and scanner interface, please accept the invitation below. Ensure you use this email address when signing in or creating your account.</p>

      ${emailButtonHtml("Accept Invitation", url)}

      <p style="font-size:12px;color:#7A6E68;margin-top:40px;border-top:1px solid #EDE8E3;padding-top:24px;">
        If the button above does not work, please copy and paste the following link into your browser:<br />
        <a href="${url}" style="color:#C9A96E;word-break:break-all;">${url}</a>
      </p>
    `;

    const html = brandEmailShell({
      title: "Staff Invitation",
      contentHtml
    });

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
