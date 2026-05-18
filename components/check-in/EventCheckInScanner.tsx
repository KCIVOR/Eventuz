"use client";

import { processTicketScan, type ProcessTicketScanPayload } from "@/app/actions/processTicketScan";
import { EVENTUZ_QR_PREFIX } from "@/lib/tickets/eventTicketQr";
import { Html5QrcodeScanner } from "html5-qrcode";
import Link from "next/link";
import { Alert } from "../ui/Alert";
import { useCallback, useEffect, useRef, useState } from "react";

type Props = {
  eventId: string;
  backHref: string;
  backLabel: string;
};

const SCANNER_ELEMENT_ID = "evz-checkin-qr-reader";

export function EventCheckInScanner({ eventId, backHref, backLabel }: Props) {
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);
  const gateRef = useRef(false);
  const runScanRef = useRef<(raw: string, source: "camera" | "manual") => Promise<void>>(
    async () => {}
  );

  const [manualCode, setManualCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ProcessTicketScanPayload | null>(null);

  const panelClass = "rounded-xl border border-border bg-card shadow-sm";

  const devicePayload = useCallback((source: "camera" | "manual") => {
    if (typeof window === "undefined") {
      return { source };
    }
    return {
      source,
      user_agent: window.navigator.userAgent,
      language: window.navigator.language,
    };
  }, []);

  const runScan = useCallback(
    async (raw: string, source: "camera" | "manual") => {
      const trimmed = raw.trim();
      if (!trimmed) return;
      setBusy(true);
      setError(null);
      const out = await processTicketScan(eventId, trimmed, devicePayload(source));
      setBusy(false);
      if (!out.ok) {
        setError(out.message);
        gateRef.current = false;
        try {
          await scannerRef.current?.resume();
        } catch {
          /* ignore */
        }
        return;
      }
      setResult(out.data);
    },
    [devicePayload, eventId]
  );

  useEffect(() => {
    runScanRef.current = runScan;
  }, [runScan]);

  useEffect(() => {
    gateRef.current = false;
    setResult(null);
    setError(null);

    const scanner = new Html5QrcodeScanner(
      SCANNER_ELEMENT_ID,
      {
        fps: 8,
        qrbox: { width: 260, height: 260 },
        rememberLastUsedCamera: true,
      },
      false
    );
    scannerRef.current = scanner;

    scanner.render(
      async (decodedText) => {
        if (gateRef.current) return;
        gateRef.current = true;
        try {
          await scanner.pause(true);
        } catch {
          /* ignore */
        }
        await runScanRef.current(decodedText, "camera");
      },
      () => {}
    );

    return () => {
      scannerRef.current = null;
      gateRef.current = false;
      scanner.clear().catch(() => {});
    };
  }, [eventId]);

  async function onManualSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (busy || gateRef.current) return;
    const code = manualCode.trim();
    if (!code) return;
    gateRef.current = true;
    try {
      await scannerRef.current?.pause(true);
    } catch {
      /* ignore */
    }
    await runScan(code, "manual");
    setManualCode("");
  }

  async function onScanAnother() {
    setResult(null);
    setError(null);
    gateRef.current = false;
    try {
      await scannerRef.current?.resume();
    } catch {
      /* ignore */
    }
  }

  const resultTone: Record<ProcessTicketScanPayload["scan_result"], string> = {
    valid: "border-success/40 bg-success-muted text-success",
    duplicate: "border-warning/40 bg-warning/10 text-warning",
    invalid: "border-destructive/35 bg-destructive-muted text-destructive",
    voided: "border-border bg-muted/50 text-muted-foreground",
  };

  const resultTitle: Record<ProcessTicketScanPayload["scan_result"], string> = {
    valid: "Checked in",
    duplicate: "Already checked in",
    invalid: "Invalid ticket",
    voided: "Ticket voided",
  };

  const dimInputs = Boolean(result) || busy;

  return (
    <div className="space-y-8">
      <p className="text-center text-sm text-muted-foreground">
        <Link href={backHref} className="font-semibold text-primary underline-offset-4 hover:underline">
          ← {backLabel}
        </Link>
      </p>

      <p className="text-center text-xs leading-relaxed text-muted-foreground">
        Camera scans full QR codes ({EVENTUZ_QR_PREFIX}…). You can also type the ticket code (e.g.{" "}
        <span className="font-mono text-foreground">EVZ-XXXXXXXX</span>). Signed payloads are verified
        on the server; successful scans only show the guest name and ticket code here.
      </p>

      {error ? (
        <Alert type="error" title="Check-in Error">
          {error}
        </Alert>
      ) : null}

      {result ? (
        <div
          className={`rounded-2xl border px-6 py-8 text-center shadow-sm ${panelClass} ${resultTone[result.scan_result]}`}
        >
          <p className="text-xs font-semibold uppercase tracking-wide opacity-80">Result</p>
          <p className="mt-2 font-serif text-2xl font-semibold">{resultTitle[result.scan_result]}</p>
          {result.ticket_code ? (
            <p className="mt-4 font-mono text-sm opacity-90">{result.ticket_code}</p>
          ) : null}
          {result.attendee_name ? (
            <p className="mt-2 text-sm leading-relaxed opacity-95">{result.attendee_name}</p>
          ) : null}
          <button
            type="button"
            onClick={() => void onScanAnother()}
            className="mt-8 rounded-xl bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary-hover"
          >
            Scan another
          </button>
        </div>
      ) : null}

      <div
        className={
          dimInputs && !error ? "pointer-events-none opacity-45 transition-opacity" : "transition-opacity"
        }
      >
        <div className={panelClass + " overflow-hidden p-4"}>
          <p className="mb-3 text-center text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Camera
          </p>
          <div id={SCANNER_ELEMENT_ID} className="min-h-[280px]" />
          {busy ? (
            <p className="mt-3 text-center text-xs text-muted-foreground">Checking ticket…</p>
          ) : null}
        </div>

        <form onSubmit={(e) => void onManualSubmit(e)} className={`${panelClass} mt-6 space-y-4 p-6`}>
          <p className="text-center text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Manual entry
          </p>
          <label className="flex flex-col gap-1.5 text-left">
            <span className="text-xs font-medium text-muted-foreground">Ticket code or paste QR text</span>
            <input
              value={manualCode}
              onChange={(e) => setManualCode(e.target.value)}
              autoComplete="off"
              placeholder="EVZ-XXXXXXXX or full QR string"
              disabled={busy || Boolean(result)}
              className="rounded-xl border border-border bg-background px-3 py-2.5 font-mono text-sm text-foreground focus-visible:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20"
            />
          </label>
          <button
            type="submit"
            disabled={busy || Boolean(result) || !manualCode.trim()}
            className="w-full rounded-xl border border-border bg-card py-2.5 text-sm font-semibold text-foreground transition-colors hover:bg-muted/40 disabled:opacity-50"
          >
            {busy ? "Checking…" : "Check ticket"}
          </button>
        </form>
      </div>
    </div>
  );
}
