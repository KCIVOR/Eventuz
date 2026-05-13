"use client";

import { AuthShell } from "@/components/layout/AuthShell";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Input } from "@/components/ui/Input";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage("");
    setIsError(false);

    const supabase = createClient();
    const origin = window.location.origin;

    const { checkEmailExists } = await import("./actions");
    const exists = await checkEmailExists(email);

    if (!exists) {
      // Security best practice: don't reveal if account exists, 
      // but the user EXPLICITLY asked to check if it exists first.
      setIsError(true);
      setMessage("No account found with this email address.");
      setLoading(false);
      return;
    }

    // 2. Send reset email
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${origin}/reset-password`,
    });

    setLoading(false);
    if (error) {
      setIsError(true);
      setMessage(error.message);
    } else {
      setIsError(false);
      setMessage("If an account exists, a password reset link has been sent to your email.");
    }
  }

  return (
    <AuthShell title="Forgot password" backHref="/login" backLabel="Back to login">
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <p className="text-sm leading-relaxed text-muted-foreground">
          Enter your email address and we&apos;ll send you a link to reset your password.
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
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          label="Email address"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={loading}
        />

        <button
          type="submit"
          disabled={loading}
          className="mt-2 rounded-xl bg-primary py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary-hover disabled:opacity-50"
        >
          {loading ? "Sending link…" : "Send reset link"}
        </button>
      </form>
    </AuthShell>
  );
}
