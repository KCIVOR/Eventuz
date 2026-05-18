"use client";

import { AuthShell } from "@/components/layout/AuthShell";
import { LoginForm } from "@/components/auth/LoginForm";
import { Suspense } from "react";

export default function LoginPage() {
  return (
    <AuthShell title="Log in">
      <Suspense
        fallback={<p className="text-center text-sm text-muted-foreground">Loading…</p>}
      >
        <LoginForm />
      </Suspense>
    </AuthShell>
  );
}
