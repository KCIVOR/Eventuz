"use server";

import { createAdminClient } from "@/lib/supabase/admin";

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
