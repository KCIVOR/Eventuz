"use server";

import { encryptSmtpPassword, decryptSmtpPassword } from "@/lib/utils/crypto";
import { sendTestMessage } from "@/lib/smtp/sendTestMessage";
import { writeAuditLogSafe } from "@/lib/audit/writeAuditLog";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export type SmtpActionState = { error?: string; ok?: string };

async function requireSuperAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login?next=/super-admin/smtp");
  }
  const { data: p } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (p?.role !== "super_admin") {
    redirect("/");
  }
  return supabase;
}

export async function saveSmtpSettingsAction(
  _prev: SmtpActionState,
  formData: FormData
): Promise<SmtpActionState> {
  try {
    const supabase = await requireSuperAdmin();

    const host = String(formData.get("host") ?? "").trim();
    const port = Number(formData.get("port") ?? "");
    const username = String(formData.get("username") ?? "").trim();
    const password = String(formData.get("password") ?? "");
    const from_email = String(formData.get("from_email") ?? "").trim();
    const from_name = String(formData.get("from_name") ?? "").trim();
    const encryption_type = String(formData.get("encryption_type") ?? "tls");
    const is_active = formData.get("is_active") === "on";

    if (!host || !Number.isFinite(port) || !username || !from_email || !from_name) {
      return { error: "Host, port, username, from email, and from name are required." };
    }
    if (!["tls", "ssl", "none"].includes(encryption_type)) {
      return { error: "Invalid encryption type." };
    }

    const { data: existingRow } = await supabase
      .from("smtp_settings")
      .select("id, encrypted_password")
      .limit(1)
      .maybeSingle();

    let encrypted_password: string;
    if (password.length > 0) {
      encrypted_password = encryptSmtpPassword(password);
    } else if (existingRow?.encrypted_password) {
      encrypted_password = existingRow.encrypted_password as string;
    } else {
      return { error: "Password is required on first save." };
    }

    const row = {
      host,
      port: Math.floor(port),
      username,
      encrypted_password,
      from_email,
      from_name,
      encryption_type,
      is_active,
    };

    if (existingRow?.id) {
      const { error } = await supabase.from("smtp_settings").update(row).eq("id", existingRow.id as string);
      if (error) {
        return { error: error.message };
      }
    } else {
      const { error } = await supabase.from("smtp_settings").insert(row);
      if (error) {
        return { error: error.message };
      }
    }

    await writeAuditLogSafe(supabase, {
      action: "smtp.settings_changed",
      entityType: "smtp_settings",
      entityId: (existingRow?.id as string) ?? null,
      metadata: {
        host,
        port: Math.floor(port),
        encryption_type,
        is_active,
        from_email,
        password_updated: password.length > 0,
      },
    });

    revalidatePath("/super-admin/smtp");
    revalidatePath("/super-admin");
    return { ok: "SMTP settings saved." };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Could not save settings.";
    return { error: msg };
  }
}

export async function testSmtpSettingsAction(
  _prev: SmtpActionState,
  formData: FormData
): Promise<SmtpActionState> {
  const supabase = await requireSuperAdmin();
  const testTo = String(formData.get("test_to") ?? "").trim();
  const id = String(formData.get("id") ?? "").trim();
  const now = new Date().toISOString();

  if (!testTo || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(testTo)) {
    return { error: "Enter a valid email address for the test message." };
  }

  let settingsId: string | null = null;

  try {
    let q = supabase.from("smtp_settings").select("*");
    if (id) {
      q = q.eq("id", id);
    } else {
      q = q.eq("is_active", true);
    }
    const { data: row, error: loadErr } = await q.limit(1).maybeSingle();
    if (loadErr) {
      return { error: loadErr.message };
    }
    if (!row) {
      return { error: "Save SMTP settings before sending a test." };
    }

    settingsId = row.id as string;

    const plain = decryptSmtpPassword(row.encrypted_password as string);
    await sendTestMessage(
      {
        host: row.host as string,
        port: Number(row.port),
        username: row.username as string,
        password: plain,
        from_email: row.from_email as string,
        from_name: row.from_name as string,
        encryption_type: row.encryption_type as "tls" | "ssl" | "none",
      },
      testTo
    );

    await supabase
      .from("smtp_settings")
      .update({ last_tested_at: now, last_test_error: null })
      .eq("id", settingsId);

    revalidatePath("/super-admin/smtp");
    return { ok: "Test email sent. Check the inbox and spam folder." };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Test send failed.";
    if (settingsId) {
      await supabase
        .from("smtp_settings")
        .update({ last_tested_at: now, last_test_error: msg })
        .eq("id", settingsId);
    }
    revalidatePath("/super-admin/smtp");
    return { error: msg };
  }
}
