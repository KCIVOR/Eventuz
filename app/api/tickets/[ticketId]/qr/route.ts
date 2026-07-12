import { createHash } from "node:crypto";
import { eventTicketQrPngBuffer } from "@/lib/tickets/eventTicketQr";
import { createServiceRoleClient } from "@/lib/supabase/serviceRole";

export const runtime = "nodejs";

type TicketQrRouteContext = {
  params: Promise<{ ticketId: string }>;
};

function notFound() {
  return new Response("Not found", {
    status: 404,
    headers: {
      "Cache-Control": "private, no-store",
    },
  });
}

function sha256Hex(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

export async function GET(req: Request, ctx: TicketQrRouteContext) {
  const { ticketId } = await ctx.params;
  const url = new URL(req.url);
  const token = url.searchParams.get("token")?.trim();

  if (!ticketId || !token) {
    return notFound();
  }

  const admin = createServiceRoleClient();
  const { data: ticket, error } = await admin
    .from("tickets")
    .select("id, qr_token_hash, status")
    .eq("id", ticketId)
    .maybeSingle();

  if (error || !ticket || ticket.status === "voided") {
    return notFound();
  }

  if (sha256Hex(token) !== ticket.qr_token_hash) {
    return notFound();
  }

  const png = await eventTicketQrPngBuffer(token);
  const bytes = new Uint8Array(png.byteLength);
  bytes.set(png);
  return new Response(bytes.buffer, {
    status: 200,
    headers: {
      "Content-Type": "image/png",
      "Content-Length": String(png.length),
      "Cache-Control": "private, max-age=300",
      "X-Robots-Tag": "noindex, nofollow, noarchive",
    },
  });
}
