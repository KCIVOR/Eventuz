import { createClient } from "@/lib/supabase/server";

export type ActiveTermsForRegistration = {
  id: string;
  content: string;
  version: number;
  updated_at: string;
};

export type TermsSettingsPublic = ActiveTermsForRegistration & {
  is_active: boolean;
  created_at: string;
  updated_by: string | null;
};

export async function loadActiveTermsForRegistration(): Promise<{
  terms: ActiveTermsForRegistration | null;
  error: string | null;
}> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_active_platform_terms");

  if (error) {
    return { terms: null, error: error.message };
  }

  const row = Array.isArray(data) ? data[0] : null;
  if (!row) {
    return { terms: null, error: null };
  }

  return {
    terms: {
      id: row.id as string,
      content: row.content as string,
      version: Number(row.version),
      updated_at: String(row.updated_at),
    },
    error: null,
  };
}

export async function loadTermsSettingsForSuperAdmin(): Promise<{
  settings: TermsSettingsPublic | null;
  error: string | null;
}> {
  const supabase = await createClient();
  const { data: row, error } = await supabase
    .from("platform_terms_settings")
    .select("*")
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    return { settings: null, error: error.message };
  }
  if (!row) {
    return { settings: null, error: null };
  }

  return {
    settings: {
      id: row.id as string,
      content: row.content as string,
      version: Number(row.version),
      is_active: Boolean(row.is_active),
      updated_by: row.updated_by ? String(row.updated_by) : null,
      created_at: String(row.created_at),
      updated_at: String(row.updated_at),
    },
    error: null,
  };
}
