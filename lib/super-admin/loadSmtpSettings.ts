import { createClient } from "@/lib/supabase/server";

export type SmtpSettingsPublic = {
  id: string;
  host: string;
  port: number;
  username: string;
  from_email: string;
  from_name: string;
  encryption_type: "tls" | "ssl" | "none";
  is_active: boolean;
  last_tested_at: string | null;
  last_test_error: string | null;
  created_at: string;
  updated_at: string;
  passwordSaved: boolean;
};

export async function loadSmtpSettingsPublic(): Promise<{
  settings: SmtpSettingsPublic | null;
  error: string | null;
}> {
  const supabase = await createClient();
  const { data: row, error } = await supabase.from("smtp_settings").select("*").limit(1).maybeSingle();

  if (error) {
    return { settings: null, error: error.message };
  }
  if (!row) {
    return { settings: null, error: null };
  }

  const encrypted = row.encrypted_password as string | null;
  return {
    settings: {
      id: row.id as string,
      host: row.host as string,
      port: Number(row.port),
      username: row.username as string,
      from_email: row.from_email as string,
      from_name: row.from_name as string,
      encryption_type: row.encryption_type as SmtpSettingsPublic["encryption_type"],
      is_active: Boolean(row.is_active),
      last_tested_at: row.last_tested_at ? String(row.last_tested_at) : null,
      last_test_error: row.last_test_error ? String(row.last_test_error) : null,
      created_at: String(row.created_at),
      updated_at: String(row.updated_at),
      passwordSaved: Boolean(encrypted && encrypted.length > 0),
    },
    error: null,
  };
}
