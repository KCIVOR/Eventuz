"use server";

import { loadActiveTermsForRegistration } from "@/lib/super-admin/loadTermsSettings";
import { createServiceRoleClient } from "@/lib/supabase/serviceRole";
import { createClient } from "@/lib/supabase/server";
import { headers } from "next/headers";

export type RegisterActionState = { error?: string; ok?: string };

function safeNext(raw: FormDataEntryValue | null): string {
  const next = String(raw ?? "");
  if (!next.startsWith("/") || next.startsWith("//")) return "/attendee/event";
  if (next.startsWith("/login") || next.startsWith("/register")) return "/attendee/event";
  return next;
}

function emailLooksValid(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export async function registerAccountAction(
  _prev: RegisterActionState,
  formData: FormData
): Promise<RegisterActionState> {
  const fullName = String(formData.get("full_name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const phoneNumber = String(formData.get("phone_number") ?? "").trim();
  const birthday = String(formData.get("birthday") ?? "").trim();
  const organizationName = String(formData.get("organization_name") ?? "").trim();
  const address = String(formData.get("address") ?? "").trim();
  const accepted = formData.get("terms_accepted") === "on";
  const submittedTermsId = String(formData.get("terms_id") ?? "").trim();
  const submittedTermsVersion = Number(formData.get("terms_version") ?? "");
  const next = safeNext(formData.get("next"));

  if (!fullName) return { error: "Full name is required." };
  if (!emailLooksValid(email)) return { error: "Enter a valid email address." };
  if (password.length < 6) return { error: "Password must be at least 6 characters." };
  if (!phoneNumber) return { error: "Phone number is required." };
  if (!birthday) return { error: "Birthday is required." };
  if (!organizationName) return { error: "Organization name is required." };
  if (!address) return { error: "Address is required." };
  if (!accepted) return { error: "You must accept the Terms and Conditions to create an account." };

  const { terms, error: termsError } = await loadActiveTermsForRegistration();
  if (termsError) return { error: termsError };
  if (!terms) {
    return { error: "Account creation is temporarily unavailable because Terms and Conditions are not configured." };
  }
  if (terms.id !== submittedTermsId || terms.version !== submittedTermsVersion) {
    return { error: "The Terms and Conditions changed. Review them and try again." };
  }

  const headerStore = await headers();
  const origin =
    headerStore.get("origin") ??
    `${headerStore.get("x-forwarded-proto") ?? "http"}://${headerStore.get("host") ?? "localhost:3000"}`;
  const nextQuery = encodeURIComponent(next);

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${origin}/auth/callback?next=${nextQuery}`,
      data: { 
        full_name: fullName,
        phone_number: phoneNumber,
        birthday,
        organization_name: organizationName,
        address
      },
    },
  });

  if (error) {
    return { error: error.message };
  }

  const userId = data.user?.id;
  if (!userId) {
    return { error: "Account was created, but no user ID was returned. Please sign in and contact support if needed." };
  }

  // Update profile row with the extra fields (trigger handle_new_user might have created it already)
  try {
    const admin = createServiceRoleClient();
    
    // We update the profile to include the new fields. 
    // We use service role to ensure we can update the row even before the user confirms email (if enabled).
    const { error: profileUpdateError } = await admin.from("profiles").update({
      organization_name: organizationName,
      address: address,
      birthday: birthday,
      phone_number: phoneNumber
    }).eq("id", userId);

    if (profileUpdateError) {
      console.error("Profile update error during registration:", profileUpdateError);
      // We don't return error here because auth account is already created, 
      // but we log it. The user can update it later or it might have worked via trigger if we updated it.
    }

    const { error: acceptanceError } = await admin.from("profile_terms_acceptances").upsert(
      {
        profile_id: userId,
        terms_id: terms.id,
        terms_version: terms.version,
      },
      { onConflict: "profile_id,terms_id" }
    );

    if (acceptanceError) {
      return {
        error:
          "Account created, but Terms acceptance could not be recorded. Please contact support before continuing.",
      };
    }
  } catch (e) {
    return {
      error: e instanceof Error ? e.message : "Account created, but Terms acceptance could not be recorded.",
    };
  }

  return {
    ok: "Check your email to confirm your account (if confirmation is enabled in Supabase), then sign in.",
  };
}
