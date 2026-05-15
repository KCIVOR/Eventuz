"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

/**
 * Updates the user's profile details in the profiles table.
 */
export async function updateProfileDetails(formData: FormData) {
  const fullName = String(formData.get("full_name") ?? "").trim();
  const organizationName = String(formData.get("organization_name") ?? "").trim();
  const address = String(formData.get("address") ?? "").trim();
  const birthday = String(formData.get("birthday") ?? "").trim();
  const phoneNumber = String(formData.get("phone_number") ?? "").trim();
  const bio = String(formData.get("bio") ?? "").trim();

  if (!fullName) return { error: "Full name is required." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "You must be logged in to update your profile." };

  const { error } = await supabase
    .from("profiles")
    .update({ 
      full_name: fullName,
      organization_name: organizationName || null,
      address: address || null,
      birthday: birthday || null,
      phone_number: phoneNumber || null,
      bio: bio || null
    })
    .eq("id", user.id);

  if (error) return { error: error.message };

  revalidatePath("/", "layout");
  return { success: true };
}

/**
 * Updates the user's password using Supabase Auth.
 * Requires the current password for validation.
 */
export async function updateProfilePassword(formData: FormData) {
  const currentPassword = String(formData.get("current_password") ?? "");
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm_password") ?? "");

  if (!currentPassword) return { error: "Current password is required." };
  if (password.length < 6) return { error: "New password must be at least 6 characters." };
  if (password !== confirm) return { error: "Passwords do not match." };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated." };

  // Verify current password by attempting to sign in
  const { error: verifyError } = await supabase.auth.signInWithPassword({
    email: user.email!,
    password: currentPassword,
  });

  if (verifyError) {
    return { error: "Incorrect current password." };
  }

  // Update to new password
  const { error } = await supabase.auth.updateUser({ password });

  if (error) return { error: error.message };

  return { success: true };
}

/**
 * Uploads a new profile picture to Supabase Storage and updates the profile record.
 */
export async function updateProfileAvatar(formData: FormData) {
  const file = formData.get("avatar") as File;
  if (!file || file.size === 0) return { error: "No image file provided." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "You must be logged in to update your avatar." };

  // Generate a unique file path: avatars/{user_id}/{random_string}_{timestamp}.ext
  const fileExt = file.name.split(".").pop();
  const fileName = `${Math.random().toString(36).substring(2, 10)}_${Date.now()}.${fileExt}`;
  const filePath = `${user.id}/${fileName}`;

  // 1. Upload the file to the 'avatars' bucket
  const { error: uploadError } = await supabase.storage
    .from("avatars")
    .upload(filePath, file, {
      upsert: true,
      contentType: file.type,
    });

  if (uploadError) return { error: `Upload failed: ${uploadError.message}` };

  // 2. Get the public URL for the uploaded file
  const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(filePath);

  if (!urlData?.publicUrl) return { error: "Could not retrieve public URL for the avatar." };

  // 3. Update the profile record with the new URL
  const { error: updateError } = await supabase
    .from("profiles")
    .update({ avatar_url: urlData.publicUrl })
    .eq("id", user.id);

  if (updateError) return { error: `Profile update failed: ${updateError.message}` };

  revalidatePath("/", "layout");
  return { success: true, url: urlData.publicUrl };
}
