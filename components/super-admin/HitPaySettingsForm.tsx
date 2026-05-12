"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { saveHitPaySettings } from "@/app/super-admin/hitpay/actions";

type Props = {
  initial?: {
    id: string;
    is_sandbox: boolean;
    currency: string;
    is_active: boolean;
    updated_at: string;
  } | null;
  loadError?: any;
};

export function HitPaySettingsForm({ initial, loadError }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(loadError?.message || null);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);

    const formData = new FormData(e.currentTarget);
    const res = await saveHitPaySettings(formData);

    if (res.error) {
      setError(res.error);
    } else {
      setSuccess(true);
      (e.target as HTMLFormElement).reset();
    }
    setLoading(false);
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="panel-card p-6">
        <form onSubmit={handleSubmit} className="flex flex-col gap-6">
          <div className="grid gap-6 sm:grid-cols-2">
            <Input
              id="apiKey"
              name="apiKey"
              type="password"
              required
              label="API Business Key"
              placeholder="••••••••••••••••"
            />

            <Input
              id="salt"
              name="salt"
              type="password"
              required
              label="Salt (Webhook Key)"
              placeholder="••••••••••••••••"
            />
          </div>

          <div className="grid gap-6 sm:grid-cols-2">
            <Input
              id="currency"
              name="currency"
              label="Currency"
              defaultValue={initial?.currency || "PHP"}
            />

            <div className="flex items-center gap-6 pt-6">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  name="isSandbox"
                  value="true"
                  defaultChecked={initial?.is_sandbox ?? true}
                  className="rounded border-border text-primary focus:ring-primary"
                  suppressHydrationWarning
                />
                <span className="text-sm font-medium">Sandbox Mode</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  name="isActive"
                  value="true"
                  defaultChecked={initial?.is_active ?? true}
                  className="rounded border-border text-primary focus:ring-primary"
                  suppressHydrationWarning
                />
                <span className="text-sm font-medium">Active</span>
              </label>
            </div>
          </div>

          {error && (
            <p className="text-sm text-destructive bg-destructive-muted border border-destructive/20 rounded-lg px-4 py-2">
              {error}
            </p>
          )}

          {success && (
            <p className="text-sm text-success bg-success-muted border border-success/20 rounded-lg px-4 py-2">
              Settings saved successfully! Future payments will use these credentials.
            </p>
          )}

          <div className="flex items-center gap-4 border-t border-border pt-6">
            <Button type="submit" isLoading={loading}>
              Update HitPay Configuration
            </Button>
            {initial && (
              <p className="text-xs text-muted-foreground">
                Last updated: {new Date(initial.updated_at).toLocaleString()}
              </p>
            )}
          </div>
        </form>
      </div>

      <div className="callout-eventuz">
        <strong className="font-semibold text-foreground">Security Warning</strong>
        <p className="mt-1 text-muted-foreground">
          Updating these settings will immediately affect all new checkouts. Ensure your Salt matches the one configured in the HitPay dashboard for webhooks.
        </p>
      </div>
    </div>
  );
}
