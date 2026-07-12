import QRCode from "qrcode";

/** Prepended to signed ticket payloads in QR codes (matches `process_ticket_scan` in DB). */
export const EVENTUZ_QR_PREFIX = "eventuz:v2:" as const;

const PREFIX = EVENTUZ_QR_PREFIX;

/** Full QR string for scanners (prefix + signed payload from `ticket_qr_payload` RPC). */
export function eventTicketQrPayload(signedPayloadFromRpc: string): string {
  return `${PREFIX}${signedPayloadFromRpc}`;
}

export async function eventTicketQrDataUrl(signedPayloadFromRpc: string): Promise<string> {
  return QRCode.toDataURL(eventTicketQrPayload(signedPayloadFromRpc), {
    errorCorrectionLevel: "M",
    margin: 1,
    width: 280,
    color: { dark: "#1c1917", light: "#faf8f5" },
  });
}

export async function eventTicketQrPngBuffer(signedPayloadFromRpc: string): Promise<Buffer> {
  return QRCode.toBuffer(eventTicketQrPayload(signedPayloadFromRpc), {
    errorCorrectionLevel: "M",
    margin: 1,
    width: 280,
    color: { dark: "#1c1917", light: "#faf8f5" },
    type: "png",
  });
}
