import nodemailer from "nodemailer";

export type SmtpDecryptedConfig = {
  host: string;
  port: number;
  username: string;
  password: string;
  from_email: string;
  from_name: string;
  encryption_type: "tls" | "ssl" | "none";
};

function transportOptions(cfg: SmtpDecryptedConfig) {
  const secure = cfg.encryption_type === "ssl";
  return {
    host: cfg.host,
    port: cfg.port,
    secure,
    auth: {
      user: cfg.username,
      pass: cfg.password,
    },
    requireTLS: cfg.encryption_type === "tls",
    ignoreTLS: cfg.encryption_type === "none",
  };
}

export function createSmtpTransport(cfg: SmtpDecryptedConfig) {
  return nodemailer.createTransport(transportOptions(cfg));
}

export function formatSmtpFrom(cfg: SmtpDecryptedConfig): string {
  return `"${cfg.from_name.replace(/"/g, "")}" <${cfg.from_email}>`;
}

export async function sendTestMessage(cfg: SmtpDecryptedConfig, to: string): Promise<void> {
  const transporter = createSmtpTransport(cfg);
  const from = formatSmtpFrom(cfg);
  await transporter.sendMail({
    from,
    to,
    subject: "Eventuz SMTP test",
    text: "This is a test message from Eventuz. SMTP settings are working.",
    html: "<p>This is a test message from Eventuz. SMTP settings are working.</p>",
  });
}
