import { createCipheriv, createDecipheriv, createHash, randomBytes } from "crypto";

const VERSION = "v1";

function encryptionKey(): Buffer {
  const raw = process.env.SMTP_SETTINGS_ENCRYPTION_KEY;
  if (!raw || raw.length < 32) {
    throw new Error(
      "SMTP_SETTINGS_ENCRYPTION_KEY is missing or too short (use at least 32 characters in production)."
    );
  }
  return createHash("sha256").update(raw).digest();
}

/** Store in DB column `encrypted_password` (not reversible without env key). */
export function encryptSmtpPassword(plain: string): string {
  const key = encryptionKey();
  const iv = randomBytes(16);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const enc = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [VERSION, iv.toString("base64url"), tag.toString("base64url"), enc.toString("base64url")].join(":");
}

export function decryptSmtpPassword(stored: string): string {
  const parts = stored.split(":");
  if (parts.length !== 4 || parts[0] !== VERSION) {
    throw new Error("Stored SMTP password format is invalid.");
  }
  const [, ivB64, tagB64, dataB64] = parts;
  const key = encryptionKey();
  const iv = Buffer.from(ivB64, "base64url");
  const tag = Buffer.from(tagB64, "base64url");
  const data = Buffer.from(dataB64, "base64url");
  const decipher = createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(data), decipher.final()]).toString("utf8");
}
