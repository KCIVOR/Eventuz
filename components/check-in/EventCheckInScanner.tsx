"use client";

import { processTicketScan, type ProcessTicketScanPayload } from "@/app/actions/processTicketScan";
import { EVENTUZ_QR_PREFIX } from "@/lib/tickets/eventTicketQr";
import { Html5Qrcode } from "html5-qrcode";
import Link from "next/link";
import { Alert } from "../ui/Alert";
import { useCallback, useEffect, useRef, useState } from "react";

type Props = {
  eventId: string;
  backHref: string;
  backLabel: string;
};

type CameraState = "idle" | "requesting" | "active" | "stopped" | "error";
type CameraDevice = Awaited<ReturnType<typeof Html5Qrcode.getCameras>>[number];

const SCANNER_ELEMENT_ID = "evz-checkin-qr-reader";
const scanConfig = {
  fps: 8,
  qrbox: { width: 260, height: 260 },
};

function nullableString(value: string | null | undefined): string {
  return value?.trim() || "-";
}

function formatDateTime(value: string | null): string {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function seatLocation(result: ProcessTicketScanPayload): string {
  if (!result.seat_display_label) return "-";
  const parts = [result.seat_display_label];
  if (result.table_label) parts.push(result.table_label);
  if (result.seat_label && result.seat_label !== result.seat_display_label) {
    parts.push(`Seat ${result.seat_label}`);
  }
  return parts.join(" · ");
}

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="grid gap-1 border-b border-border/70 py-3 last:border-b-0 sm:grid-cols-[9rem_1fr]">
      <dt className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
        {label}
      </dt>
      <dd className="text-sm text-foreground">{value || "-"}</dd>
    </div>
  );
}

export function EventCheckInScanner({ eventId, backHref, backLabel }: Props) {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const gateRef = useRef(false);
  const activeCameraRef = useRef<string | MediaTrackConstraints | null>(null);
  const runScanRef = useRef<(raw: string, source: "camera" | "manual") => Promise<void>>(
    async () => {}
  );

  const [manualCode, setManualCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [cameraState, setCameraState] = useState<CameraState>("idle");
  const [cameraLabel, setCameraLabel] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ProcessTicketScanPayload | null>(null);

  const panelClass = "rounded-2xl border border-border bg-card shadow-sm";

  const devicePayload = useCallback((source: "camera" | "manual") => {
    if (typeof window === "undefined") {
      return { source };
    }
    return {
      source,
      camera: cameraLabel,
      user_agent: window.navigator.userAgent,
      language: window.navigator.language,
    };
  }, [cameraLabel]);

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
          scannerRef.current?.resume();
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

    return () => {
      gateRef.current = false;
      const scanner = scannerRef.current;
      scannerRef.current = null;
      if (scanner?.isScanning) {
        scanner.stop().then(() => scanner.clear()).catch(() => {});
      } else {
        try {
          scanner?.clear();
        } catch {
          /* ignore */
        }
      }
    };
  }, [eventId]);

  function getScanner(): Html5Qrcode {
    if (!scannerRef.current) {
      scannerRef.current = new Html5Qrcode(SCANNER_ELEMENT_ID, false);
    }
    return scannerRef.current;
  }

  async function stopCamera(nextState: CameraState = "stopped") {
    const scanner = scannerRef.current;
    gateRef.current = false;
    activeCameraRef.current = null;
    setCameraLabel(null);

    if (!scanner) {
      setCameraState(nextState);
      return;
    }

    try {
      if (scanner.isScanning) {
        await scanner.stop();
      }
      scanner.clear();
    } catch {
      /* ignore */
    } finally {
      scannerRef.current = null;
      setCameraState(nextState);
    }
  }

  function preferredCamera(cameras: CameraDevice[]): CameraDevice | null {
    if (cameras.length === 0) return null;
    const rear = cameras.find((camera) => /back|rear|environment/i.test(camera.label ?? ""));
    return rear ?? cameras[cameras.length - 1] ?? cameras[0] ?? null;
  }

  async function startWith(camera: string | MediaTrackConstraints, label: string): Promise<boolean> {
    const scanner = getScanner();
    try {
      await scanner.start(
        camera,
        scanConfig,
        async (decodedText) => {
          if (gateRef.current) return;
          gateRef.current = true;
          try {
            scanner.pause(true);
          } catch {
            /* ignore */
          }
          await runScanRef.current(decodedText, "camera");
        },
        () => {}
      );
      activeCameraRef.current = camera;
      setCameraLabel(label);
      setCameraState("active");
      return true;
    } catch {
      return false;
    }
  }

  async function startCamera() {
    if (busy || cameraState === "requesting" || cameraState === "active") return;
    setError(null);
    setResult(null);
    setCameraState("requesting");
    gateRef.current = false;

    await stopCamera("requesting");

    const exactRearStarted = await startWith(
      { facingMode: { exact: "environment" } },
      "Back camera"
    );
    if (exactRearStarted) return;

    const rearStarted = await startWith({ facingMode: "environment" }, "Back camera");
    if (rearStarted) return;

    try {
      const cameras = await Html5Qrcode.getCameras();
      const preferred = preferredCamera(cameras);
      if (preferred) {
        const label = preferred.label || "Camera";
        const deviceStarted = await startWith(preferred.id, label);
        if (deviceStarted) return;
      }
    } catch {
      /* fall through to visible error */
    }

    setCameraState("error");
    setError("Camera could not be started. Allow camera access, then try again or use manual entry.");
  }

  async function onManualSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (busy || gateRef.current) return;
    const code = manualCode.trim();
    if (!code) return;
    gateRef.current = true;
    try {
      scannerRef.current?.pause(true);
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
    if (activeCameraRef.current && scannerRef.current?.isScanning) {
      try {
        scannerRef.current.resume();
        setCameraState("active");
      } catch {
        await startCamera();
      }
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

  const cameraStateText: Record<CameraState, string> = {
    idle: "Camera is off",
    requesting: "Requesting camera access...",
    active: cameraLabel ? `Camera active: ${cameraLabel}` : "Camera active",
    stopped: "Camera stopped",
    error: "Camera unavailable",
  };

  const hasTicketDetails = Boolean(result?.ticket_id);
  const controlsDisabled = busy || cameraState === "requesting";

  return (
    <div className="space-y-8">
      <p className="text-center text-sm text-muted-foreground">
        <Link href={backHref} className="font-semibold text-primary underline-offset-4 hover:underline">
          ← {backLabel}
        </Link>
      </p>

      <div className={`${panelClass} overflow-hidden`}>
        <div className="border-b border-border bg-muted/30 px-5 py-4 sm:px-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent-gold">
                QR scanner
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                {cameraStateText[cameraState]}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => void startCamera()}
                disabled={controlsDisabled || cameraState === "active"}
                className="min-h-11 rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-45"
              >
                {cameraState === "requesting" ? "Requesting..." : "Start camera"}
              </button>
              <button
                type="button"
                onClick={() => void stopCamera()}
                disabled={controlsDisabled || cameraState !== "active"}
                className="min-h-11 rounded-xl border border-border bg-card px-5 text-sm font-semibold text-foreground transition-colors hover:border-primary/40 hover:bg-muted/40 disabled:cursor-not-allowed disabled:opacity-45"
              >
                Stop camera
              </button>
              {result ? (
                <button
                  type="button"
                  onClick={() => void onScanAnother()}
                  disabled={busy}
                  className="min-h-11 rounded-xl border border-accent-gold bg-accent-gold-light px-5 text-sm font-semibold text-accent-gold-dark transition-colors hover:bg-accent-gold hover:text-primary disabled:cursor-not-allowed disabled:opacity-45"
                >
                  Scan another
                </button>
              ) : null}
            </div>
          </div>
        </div>

        <div className="p-4 sm:p-6">
          <div id={SCANNER_ELEMENT_ID} className="min-h-[320px] overflow-hidden rounded-xl border border-border bg-background" />
          <p className="mt-3 text-center text-xs leading-relaxed text-muted-foreground">
            Camera scans full QR codes ({EVENTUZ_QR_PREFIX}...). You can also type the ticket code manually.
          </p>
          {busy ? (
            <p className="mt-3 text-center text-xs font-semibold uppercase tracking-wide text-accent-gold">
              Checking ticket...
            </p>
          ) : null}
        </div>
      </div>

      {error ? (
        <Alert type="error" title="Check-in Error">
          {error}
        </Alert>
      ) : null}

      {result ? (
        <section className={`${panelClass} overflow-hidden`}>
          <div className={`border-b px-6 py-5 ${resultTone[result.scan_result]}`}>
            <p className="text-xs font-semibold uppercase tracking-wide opacity-80">Result</p>
            <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <h2 className="font-serif text-3xl font-semibold">{resultTitle[result.scan_result]}</h2>
              {result.ticket_code ? (
                <p className="font-mono text-sm opacity-90">{result.ticket_code}</p>
              ) : null}
            </div>
          </div>

          {hasTicketDetails ? (
            <dl className="grid gap-x-8 px-6 py-5 lg:grid-cols-2">
              <DetailRow label="Attendee" value={nullableString(result.attendee_name)} />
              <DetailRow label="Email" value={nullableString(result.attendee_email)} />
              <DetailRow label="Ticket code" value={nullableString(result.ticket_code)} />
              <DetailRow label="Ticket status" value={nullableString(result.ticket_status)} />
              <DetailRow label="Ticket type" value={nullableString(result.ticket_type_name)} />
              <DetailRow label="Seat location" value={seatLocation(result)} />
              <DetailRow label="Seat status" value={nullableString(result.seat_status)} />
              <DetailRow label="Event" value={nullableString(result.event_name)} />
              <DetailRow label="Schedule" value={`${nullableString(result.event_date)} ${nullableString(result.event_time)}`} />
              <DetailRow label="Venue" value={nullableString(result.venue)} />
              <DetailRow label="Issued" value={formatDateTime(result.issued_at)} />
              <DetailRow label="Checked in" value={formatDateTime(result.checked_in_at)} />
            </dl>
          ) : (
            <div className="px-6 py-8 text-center text-sm text-muted-foreground">
              No matching ticket details were found for this scan.
            </div>
          )}
        </section>
      ) : null}

      <form onSubmit={(e) => void onManualSubmit(e)} className={`${panelClass} space-y-4 p-6`}>
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
            className="rounded-xl border border-border bg-background px-3 py-2.5 font-mono text-sm text-foreground focus-visible:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-50"
          />
        </label>
        <button
          type="submit"
          disabled={busy || Boolean(result) || !manualCode.trim()}
          className="w-full rounded-xl border border-border bg-card py-2.5 text-sm font-semibold text-foreground transition-colors hover:bg-muted/40 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {busy ? "Checking..." : "Check ticket"}
        </button>
      </form>
    </div>
  );
}
