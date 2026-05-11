import { createHash, randomBytes } from "node:crypto";

/** Opaque secret embedded only in the email link; DB stores SHA-256 hex (UTF-8, trimmed) to match Postgres `accept_staff_invitation`. */
export function generateStaffInviteRawToken(): string {
  return randomBytes(32).toString("base64url");
}

export function staffInviteTokenHash(rawToken: string): string {
  const t = rawToken.trim();
  return createHash("sha256").update(t, "utf8").digest("hex");
}
