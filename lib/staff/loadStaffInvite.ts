import { staffInviteTokenHash } from "@/lib/staff/inviteToken";
import { createServiceRoleClient } from "@/lib/supabase/serviceRole";

export type StaffInviteLookup =
  | {
      found: false;
      maskedEmail: null;
      email: null;
      status: "missing";
      expiresAt: null;
    }
  | {
      found: true;
      maskedEmail: string;
      email: string;
      status: "pending" | "expired" | "accepted" | "revoked";
      expiresAt: string;
    };

function maskEmail(email: string): string {
  const [localRaw, domainRaw] = email.split("@");
  const local = localRaw ?? "";
  const domain = domainRaw ?? "";
  if (!local || !domain) return "this invited email";

  const visibleStart = local.slice(0, Math.min(2, local.length));
  const visibleEnd = local.length > 4 ? local.slice(-1) : "";
  return `${visibleStart}${"*".repeat(Math.max(3, local.length - visibleStart.length - visibleEnd.length))}${visibleEnd}@${domain}`;
}

export async function loadStaffInviteByRawToken(rawToken: string): Promise<StaffInviteLookup> {
  const token = rawToken.trim();
  if (!token) {
    return { found: false, maskedEmail: null, email: null, status: "missing", expiresAt: null };
  }

  try {
    const supabase = createServiceRoleClient();
    const { data: invite } = await supabase
      .from("staff_invitations")
      .select("email, status, expires_at")
      .eq("invite_token_hash", staffInviteTokenHash(token))
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!invite?.email) {
      return { found: false, maskedEmail: null, email: null, status: "missing", expiresAt: null };
    }

    const email = String(invite.email).trim().toLowerCase();
    const rawStatus = String(invite.status ?? "pending");
    const expiresAt = String(invite.expires_at);
    const isExpired = rawStatus === "pending" && new Date(expiresAt).getTime() <= Date.now();
    const status =
      isExpired || rawStatus === "expired"
        ? "expired"
        : rawStatus === "accepted"
          ? "accepted"
          : rawStatus === "revoked"
            ? "revoked"
            : "pending";

    return {
      found: true,
      maskedEmail: maskEmail(email),
      email,
      status,
      expiresAt,
    };
  } catch (e) {
    console.error("[eventuz:staff-invite]", e instanceof Error ? e.message : e);
    return { found: false, maskedEmail: null, email: null, status: "missing", expiresAt: null };
  }
}
