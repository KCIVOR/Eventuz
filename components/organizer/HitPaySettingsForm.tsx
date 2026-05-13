"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { saveOrganizerHitPaySettings } from "@/app/organizer/settings/hitpay/actions";

type Props = {
  initial?: {
    id: string;
    apiKey: string;
    salt: string;
    encryptedApiKey: string;
    encryptedSalt: string;
    isSandbox: boolean;
    currency: string;
    isActive: boolean;
    allowSimulation: boolean;
    updatedAt: string;
  } | null;
  loadError?: string | null;
};

export function HitPaySettingsForm({ initial, loadError }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(loadError || null);
  const [success, setSuccess] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);
  const [showSalt, setShowSalt] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);

    const formData = new FormData(e.currentTarget);
    const res = await saveOrganizerHitPaySettings(formData);

    if (res.error) {
      setError(res.error);
    } else {
      setSuccess(true);
    }
    setLoading(false);
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="panel-card p-6">
        <form onSubmit={handleSubmit} className="flex flex-col gap-6">
          <div className="grid gap-6 sm:grid-cols-2">
            <div className="relative group">
              <Input
                id="apiKey"
                name="apiKey"
                type={showApiKey ? "text" : "password"}
                required={!initial?.encryptedApiKey}
                label="HitPay API Key"
                placeholder="Paste your HitPay API key here"
                defaultValue={initial?.encryptedApiKey || ""}
              />
              <button
                type="button"
                onClick={() => setShowApiKey(!showApiKey)}
                className="absolute right-3 bottom-2.5 p-1 text-muted-foreground hover:text-foreground transition-colors"
              >
                {showApiKey ? (
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9.88 9.88L3 3m10.12 10.12L21 21m-6.12-6.12l-.92.92A3 3 0 1 1 9.77 9.77l.92-.92M21 12.55A11 11 0 0 1 12 17c-1.88 0-3.58-.53-5-1.45m4.27-11C11.81 4.5 11.91 4.5 12 4.5a11 11 0 0 1 9 4.89"/></svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                )}
              </button>
            </div>

            <div className="relative group">
              <Input
                id="salt"
                name="salt"
                type={showSalt ? "text" : "password"}
                required={!initial?.encryptedSalt}
                label="HitPay Salt (Webhook Key)"
                placeholder="Paste your HitPay Salt here"
                defaultValue={initial?.encryptedSalt || ""}
              />
              <button
                type="button"
                onClick={() => setShowSalt(!showSalt)}
                className="absolute right-3 bottom-2.5 p-1 text-muted-foreground hover:text-foreground transition-colors"
              >
                {showSalt ? (
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9.88 9.88L3 3m10.12 10.12L21 21m-6.12-6.12l-.92.92A3 3 0 1 1 9.77 9.77l.92-.92M21 12.55A11 11 0 0 1 12 17c-1.88 0-3.58-.53-5-1.45m4.27-11C11.81 4.5 11.91 4.5 12 4.5a11 11 0 0 1 9 4.89"/></svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                )}
              </button>
            </div>
          </div>

          <div className="grid gap-6 sm:grid-cols-2">
            <Input
              id="currency"
              name="currency"
              label="Currency"
              defaultValue={initial?.currency || "PHP"}
            />

            <div className="flex flex-wrap items-center gap-6 pt-6">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  name="isSandbox"
                  value="true"
                  defaultChecked={initial?.isSandbox ?? true}
                  className="rounded border-border text-primary focus:ring-primary"
                />
                <span className="text-sm font-medium">Sandbox Mode</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  name="isActive"
                  value="true"
                  defaultChecked={initial?.isActive ?? true}
                  className="rounded border-border text-primary focus:ring-primary"
                />
                <span className="text-sm font-medium">Accept Payments</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  name="allowSimulation"
                  value="true"
                  defaultChecked={initial?.allowSimulation ?? false}
                  className="rounded border-border text-primary focus:ring-primary"
                />
                <span className="text-sm font-medium">Allow Simulation (Dev)</span>
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
              Payment settings saved successfully!
            </p>
          )}

          <div className="flex items-center justify-between border-t border-border pt-6">
            <Button type="submit" isLoading={loading}>
              Save Payment Settings
            </Button>
            {initial && (
              <p className="text-xs text-muted-foreground">
                Last updated: {new Date(initial.updatedAt).toLocaleString()}
              </p>
            )}
          </div>
        </form>
      </div>

      <div className="callout-eventuz">
        <strong className="font-semibold text-foreground">HitPay Configuration</strong>
        <p className="mt-1 text-muted-foreground">
          Enter your HitPay credentials to enable ticket sales. Your API Key and Salt are encrypted before being stored.
          Ensure you've configured the webhook URL in your HitPay dashboard:
          <code className="block mt-2 p-2 bg-secondary/50 rounded text-xs select-all">
            {typeof window !== 'undefined' ? `${window.location.origin}/api/hitpay/webhook` : 'https://your-domain.com/api/hitpay/webhook'}
          </code>
        </p>
      </div>
    </div>
  );
}
