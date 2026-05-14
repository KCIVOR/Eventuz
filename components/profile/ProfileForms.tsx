"use client";

import { useState } from "react";
import { updateProfileName, updateProfilePassword, updateProfileAvatar } from "@/app/actions/profileActions";
import { Avatar } from "@/components/ui/Avatar";

interface ProfileFormsProps {
  user: {
    email: string;
    full_name: string;
    avatar_url?: string | null;
  };
}

export function ProfileForms({ user }: ProfileFormsProps) {
  const [nameLoading, setNameLoading] = useState(false);
  const [passLoading, setPassLoading] = useState(false);
  const [avatarLoading, setAvatarLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  async function handleNameUpdate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setNameLoading(true);
    setMessage(null);
    const formData = new FormData(e.currentTarget);
    const res = await updateProfileName(formData);
    setNameLoading(false);
    if (res.error) setMessage({ type: "error", text: res.error });
    else setMessage({ type: "success", text: "Name updated successfully." });
  }

  async function handlePasswordUpdate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPassLoading(true);
    setMessage(null);
    const formData = new FormData(e.currentTarget);
    const res = await updateProfilePassword(formData);
    setPassLoading(false);
    if (res.error) setMessage({ type: "error", text: res.error });
    else {
      setMessage({ type: "success", text: "Password changed successfully." });
      (e.target as HTMLFormElement).reset();
    }
  }

  async function handleAvatarUpdate(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setAvatarLoading(true);
    setMessage(null);
    const formData = new FormData();
    formData.append("avatar", file);
    
    const res = await updateProfileAvatar(formData);
    setAvatarLoading(false);
    if (res.error) setMessage({ type: "error", text: res.error });
    else setMessage({ type: "success", text: "Profile picture updated." });
  }

  return (
    <div className="space-y-12">
      {message && (
        <div 
          className={`alert animate-fade-in-up ${message.type === "success" ? "a-success" : "a-error"}`}
        >
          <span className="alert-icon">{message.type === "success" ? "✦" : "✕"}</span>
          <div>
            <div className="alert-title">{message.type === "success" ? "Update Successful" : "Update Failed"}</div>
            <p className="text-sm opacity-90">{message.text}</p>
          </div>
        </div>
      )}

      {/* Profile Header / Avatar */}
      <section className="flex flex-col items-center gap-6 sm:flex-row sm:items-start">
        <div className="relative group">
          <Avatar src={user.avatar_url} name={user.full_name} size="lg" className="h-24 w-24 sm:h-32 sm:w-32" />
          <label 
            className="absolute inset-0 flex cursor-pointer items-center justify-center rounded-full bg-black/40 opacity-0 transition-opacity group-hover:opacity-100"
            htmlFor="avatar-upload"
          >
            <span className="text-[10px] font-semibold uppercase tracking-widest text-white">Change</span>
          </label>
          <input 
            id="avatar-upload"
            type="file" 
            accept="image/*" 
            className="hidden" 
            onChange={handleAvatarUpdate}
            disabled={avatarLoading}
          />
          {avatarLoading && (
            <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/20">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
            </div>
          )}
        </div>
        <div className="space-y-1 text-center sm:text-left">
          <h2 className="section-title">{user.full_name || "User Profile"}</h2>
          <p className="text-sm text-muted-foreground">{user.email}</p>
          <p className="eyebrow mt-4 text-[9px]">Account Management</p>
        </div>
      </section>

      <div className="grid gap-12 lg:grid-cols-2">
        {/* Personal Info Form */}
        <section className="panel-card p-6 sm:p-8">
          <h3 className="eyebrow mb-6">Personal Details</h3>
          <form onSubmit={handleNameUpdate} className="space-y-6">
            <div className="fg">
              <label className="label-eventuz">Email Address</label>
              <input 
                className="input-eventuz opacity-60 cursor-not-allowed" 
                type="email" 
                defaultValue={user.email} 
                disabled 
              />
              <span className="fh">Email cannot be changed.</span>
            </div>
            <div className="fg">
              <label className="label-eventuz">Full Name</label>
              <input 
                name="full_name"
                className="input-eventuz" 
                type="text" 
                defaultValue={user.full_name} 
                required 
              />
            </div>
            <button 
              type="submit" 
              disabled={nameLoading}
              className="btn-eventuz-gold w-full sm:w-auto"
            >
              {nameLoading ? "Updating..." : "Save Changes"}
            </button>
          </form>
        </section>

        {/* Password Form */}
        <section className="panel-card p-6 sm:p-8">
          <h3 className="eyebrow mb-6">Security & Password</h3>
          <form onSubmit={handlePasswordUpdate} className="space-y-6">
            <div className="fg">
              <label className="label-eventuz">Current Password</label>
              <input 
                name="current_password"
                className="input-eventuz" 
                type="password" 
                placeholder="••••••••"
                required 
              />
              <span className="fh">Verify your identity to change password.</span>
            </div>
            <div className="h-px bg-border/40" />
            <div className="fg">
              <label className="label-eventuz">New Password</label>
              <input 
                name="password"
                className="input-eventuz" 
                type="password" 
                placeholder="••••••••"
                required 
                minLength={6}
              />
            </div>
            <div className="fg">
              <label className="label-eventuz">Confirm New Password</label>
              <input 
                name="confirm_password"
                className="input-eventuz" 
                type="password" 
                placeholder="••••••••"
                required 
                minLength={6}
              />
            </div>
            <button 
              type="submit" 
              disabled={passLoading}
              className="btn-eventuz-primary w-full sm:w-auto"
            >
              {passLoading ? "Updating..." : "Change Password"}
            </button>
          </form>
        </section>
      </div>
    </div>
  );
}
