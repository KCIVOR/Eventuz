"use client";

import { AuthShell } from "@/components/layout/AuthShell";
import { Suspense, useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Input } from "@/components/ui/Input";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/Button";

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <AuthShell title="Reset password">
          <p className="text-center text-sm text-muted-foreground">Verifying link...</p>
        </AuthShell>
      }
    >
      <ResetPasswordForm />
    </Suspense>
  );
}

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);
  const [verifying, setVerifying] = useState(true);

  const supabase = createClient();

  useEffect(() => {
    // Ensure the user actually has a recovery session
    async function checkSession() {
      const code = searchParams.get("code");
      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (error) {
          router.replace(`/login?error=${encodeURIComponent(error.message)}`);
          return;
        }

        router.replace("/reset-password");
        setVerifying(false);
        return;
      }

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        // Not authorized to be here
        router.replace("/login?error=Invalid or expired reset link.");
      } else {
        setVerifying(false);
      }
    }
    checkSession();
  }, [router, searchParams, supabase.auth]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    
    if (password !== confirmPassword) {
      setIsError(true);
      setMessage("Passwords do not match.");
      return;
    }

    if (password.length < 6) {
      setIsError(true);
      setMessage("Password must be at least 6 characters.");
      return;
    }

    setLoading(true);
    setMessage("");
    setIsError(false);

    const { error } = await supabase.auth.updateUser({ password });

    setLoading(false);
    if (error) {
      setIsError(true);
      setMessage(error.message);
    } else {
      setIsError(false);
      setMessage("Password updated successfully! Redirecting to login...");
      // Sign out to clear the recovery session and force a fresh login
      await supabase.auth.signOut();
      setTimeout(() => {
        router.replace("/login?ok=Password changed. Please log in.");
      }, 2000);
    }
  }

  if (verifying) {
    return (
      <AuthShell title="Reset password">
        <p className="text-center text-sm text-muted-foreground">Verifying link…</p>
      </AuthShell>
    );
  }

  return (
    <AuthShell title="Set new password">
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <p className="text-sm leading-relaxed text-muted-foreground">
          Enter a new secure password for your account.
        </p>

        {message ? (
          <p
            className={`rounded-lg px-3 py-2 text-center text-sm ${
              isError
                ? "border border-destructive/20 bg-destructive-muted text-destructive"
                : "border border-success/20 bg-success-muted text-success"
            }`}
          >
            {message}
          </p>
        ) : null}

        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          label="New password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          disabled={loading}
        />

        <Input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          required
          label="Confirm new password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          disabled={loading}
        />

        <Button
          type="submit"
          isLoading={loading}
          className="w-full mt-2"
        >
          {loading ? "Updating password…" : "Update password"}
        </Button>
      </form>
    </AuthShell>
  );
}
