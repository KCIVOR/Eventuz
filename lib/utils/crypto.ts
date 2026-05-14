import { createCipheriv, createDecipheriv, createHash, randomBytes } from "crypto";

const VERSION = "v1";

/** 
 * Reuses the SMTP key as the platform-wide master encryption key.
 * This avoids needing a second env var and keeps management simple.
 */
function encryptionKey(): Buffer {
  const raw = (process.env.SMTP_SETTINGS_ENCRYPTION_KEY || "").trim();
  if (raw.length < 32) {
    throw new Error(
      "SMTP_SETTINGS_ENCRYPTION_KEY is missing or too short (use at least 32 characters in production)."
    );
  }
  return createHash("sha256").update(raw).digest();
}

/** 
 * Encrypt a string using AES-256-GCM.
 * Compatible with the existing SMTP storage format.
 */
export function encryptSecret(plain: string): string {
  const key = encryptionKey();
  const iv = randomBytes(16);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const enc = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [VERSION, iv.toString("base64url"), tag.toString("base64url"), enc.toString("base64url")].join(":");
}

/** 
 * Decrypt a string using AES-256-GCM.
 * Compatible with the existing SMTP storage format.
 */
export function decryptSecret(stored: string): string {
  const parts = stored.split(":");
  if (parts.length !== 4 || parts[0] !== VERSION) {
    throw new Error("Stored secret format is invalid.");
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

/** Legacy aliases for SMTP backward compatibility during migration */
export { encryptSecret as encryptSmtpPassword, decryptSecret as decryptSmtpPassword };
