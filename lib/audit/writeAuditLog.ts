import type { SupabaseClient } from "@supabase/supabase-js";

const SENSITIVE_KEY = /password|secret|raw_|payload|qr_raw|qrPayload|signature|salt|encrypt|webhook_body|authorization|cookie/i;

/**
 * Strip keys that could carry secrets or raw credentials before storing in audit_logs.metadata.
 */
export function sanitizeAuditMetadata(
  meta: Record<string, unknown> | undefined
): Record<string, unknown> {
  if (!meta || typeof meta !== "object") return {};
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(meta)) {
    if (SENSITIVE_KEY.test(k)) continue;
    if (v !== null && typeof v === "object" && !Array.isArray(v)) {
      out[k] = sanitizeAuditMetadata(v as Record<string, unknown>);
    } else {
      out[k] = v;
    }
  }
  return out;
}

export type WriteAuditLogParams = {
  action: string;
  entityType: string;
  entityId?: string | null;
  metadata?: Record<string, unknown>;
  /** Only honored when the client uses the service_role JWT */
  actorOverride?: string | null;
};

/**
 * Non-fatal: failures are logged to stderr only so business flows never depend on auditing.
 */
export async function writeAuditLogSafe(
  supabase: SupabaseClient,
  params: WriteAuditLogParams
): Promise<void> {
  const meta = sanitizeAuditMetadata(params.metadata);
  try {
    const { error } = await supabase.rpc("write_audit_log", {
      p_action: params.action,
      p_entity_type: params.entityType,
      p_entity_id: params.entityId ?? null,
      p_metadata: meta,
      p_actor_override: params.actorOverride ?? null,
    });
    if (error) {
      console.error("[eventuz:audit]", error.message);
    }
  } catch (e) {
    console.error("[eventuz:audit]", e instanceof Error ? e.message : e);
  }
}
