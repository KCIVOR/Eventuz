import { createClient } from "@/lib/supabase/server";
import { ProfileForms } from "@/components/profile/ProfileForms";

/**
 * Shared Profile Page for all authenticated users.
 * Content is wrapped by the DashboardFrame in layout.tsx.
 */
export default async function ProfilePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Load the profile record to get more details
  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, avatar_url, organization_name, address, birthday, phone_number, bio")
    .eq("id", user!.id)
    .single();

  const userData = {
    email: user!.email || "",
    full_name: profile?.full_name || "",
    avatar_url: profile?.avatar_url || null,
    organization_name: profile?.organization_name || "",
    address: profile?.address || "",
    birthday: profile?.birthday || "",
    phone_number: profile?.phone_number || "",
    bio: profile?.bio || "",
  };

  return (
    <div className="mx-auto w-full max-w-4xl p-4 sm:p-10">
      <div className="mb-10 flex items-center justify-between">
        <div className="space-y-1">
          <p className="eyebrow">Settings</p>
          <h1 className="section-title">My Account</h1>
        </div>
      </div>

      <ProfileForms user={userData} />
    </div>
  );
}
