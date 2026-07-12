"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { decryptSmtpPassword } from "@/lib/utils/crypto";
import { createSmtpTransport, formatSmtpFrom, type SmtpDecryptedConfig } from "@/lib/smtp/sendTestMessage";
import { brandEmailShell, emailButtonHtml } from "@/lib/utils/email/brandTemplates";
import { getAppOrigin } from "@/lib/url/site";

/**
 * Checks if a user profile exists with the given email.
 * Used for forgot password verification where RLS blocks anonymous lookups.
 */
export async function checkEmailExists(email: string): Promise<boolean> {
  if (!email?.trim()) return false;

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("profiles")
    .select("id")
    .eq("email", email.trim().toLowerCase())
    .maybeSingle();

  if (error) {
    console.error("[Auth Action] Error checking email existence:", error);
    return false;
  }

  return !!data;
}

export type PasswordResetLinkResult = {
  ok: boolean;
  error?: string;
};

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

async function loadSmtpConfig(): Promise<SmtpDecryptedConfig | null> {
  const admin = createAdminClient();
  const { data: smtpRow } = await admin
    .from("smtp_settings")
    .select("*")
    .eq("is_active", true)
    .limit(1)
    .maybeSingle();

  if (!smtpRow?.encrypted_password) return null;

  try {
    return {
      host: smtpRow.host as string,
      port: Number(smtpRow.port),
      username: smtpRow.username as string,
      password: decryptSmtpPassword(smtpRow.encrypted_password as string),
      from_email: smtpRow.from_email as string,
      from_name: smtpRow.from_name as string,
      encryption_type: smtpRow.encryption_type as SmtpDecryptedConfig["encryption_type"],
    };
  } catch {
    return null;
  }
}

export async function sendPasswordResetLink(emailRaw: string): Promise<PasswordResetLinkResult> {
  const email = emailRaw.trim().toLowerCase();
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { ok: false, error: "Enter a valid email address." };
  }

  const admin = createAdminClient();
  const { data: profile, error: profileError } = await admin
    .from("profiles")
    .select("id")
    .eq("email", email)
    .maybeSingle();

  if (profileError) {
    console.error("[Auth Action] Error checking email existence:", profileError);
    return { ok: false, error: "Could not check this email address. Try again." };
  }
  if (!profile) {
    return { ok: false, error: "No account found with this email address." };
  }

  const origin = await getAppOrigin();
  const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({
    type: "recovery",
    email,
    options: {
      redirectTo: `${origin}/auth/confirm?next=/reset-password`,
    },
  });

  if (linkError || !linkData.properties?.hashed_token) {
    return {
      ok: false,
      error: linkError?.message ?? "Could not generate a password reset link.",
    };
  }

  const resetUrl =
    `${origin}/auth/confirm?token_hash=${encodeURIComponent(linkData.properties.hashed_token)}` +
    `&type=recovery&next=${encodeURIComponent("/reset-password")}`;

  const smtpConfig = await loadSmtpConfig();
  if (!smtpConfig) {
    return {
      ok: false,
      error: "Password reset email could not be sent because SMTP is not configured.",
    };
  }

  const transporter = createSmtpTransport(smtpConfig);
  const subject = "Reset your Eventuz password";
  const text = [
    "We received a request to reset your Eventuz password.",
    "",
    "Open this link to set a new password:",
    resetUrl,
    "",
    "If you did not request this, you can safely ignore this email.",
  ].join("\n");

  const contentHtml = `
    <p>We received a request to reset the password for your <strong>Eventuz</strong> account.</p>
    <p>Use the button below to choose a new password. This link is for your account only and should not be shared.</p>
    ${emailButtonHtml("Reset Password", resetUrl)}
    <p style="font-size:12px;color:#7A6E68;margin-top:32px;line-height:1.6;">
      If the button does not work, copy and paste this link into your browser:
    </p>
    <p style="font-size:12px;line-height:1.6;word-break:break-all;">
      <a href="${resetUrl}" style="color:#C9A96E;text-decoration:underline;">${escapeHtml(resetUrl)}</a>
    </p>
    <p style="font-size:12px;color:#7A6E68;margin-top:32px;border-top:1px solid #EDE8E3;padding-top:24px;line-height:1.6;">
      If you did not request a password reset, you can safely ignore this message.
    </p>
  `;

  try {
    await transporter.sendMail({
      from: formatSmtpFrom(smtpConfig),
      to: email,
      subject,
      text,
      html: brandEmailShell({
        title: "Reset Your Password",
        contentHtml,
      }),
    });
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Could not send the password reset email.",
    };
  }

  return { ok: true };
}
