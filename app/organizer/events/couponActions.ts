"use server";

import { couponCodeHash, generateCouponCode, normalizeCouponCode } from "@/lib/coupons/codes";
import { encryptSecret } from "@/lib/utils/crypto";
import { createClient } from "@/lib/supabase/server";
import { writeAuditLogSafe } from "@/lib/audit/writeAuditLog";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

function safeRedirectPath(value: FormDataEntryValue | null, fallback: string) {
  const raw = String(value ?? "").trim();
  if (!raw.startsWith("/") || raw.startsWith("//")) return fallback;
  return raw;
}

function redirectWithError(path: string, message: string): never {
  redirect(`${path}?error=${encodeURIComponent(message)}`);
}

function redirectWithOk(path: string): never {
  redirect(`${path}?ok=1`);
}

function uniqueCodes(codes: string[]) {
  return [...new Set(codes.map(normalizeCouponCode))].filter(Boolean);
}

export async function createTicketCouponsAction(formData: FormData) {
  const eventId = String(formData.get("event_id") ?? "").trim();
  const ticketTypeId = String(formData.get("ticket_type_id") ?? "").trim();
  const redirectPath = safeRedirectPath(
    formData.get("redirect_path"),
    eventId ? `/organizer/events/${eventId}/tickets` : "/organizer"
  );
  const mode = String(formData.get("mode") ?? "manual");

  if (!eventId || !ticketTypeId) {
    redirectWithError(redirectPath, "Missing event or ticket type for coupon creation.");
  }

  let codes: string[] = [];
  if (mode === "bulk") {
    const quantity = Number(formData.get("quantity"));
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > 200) {
      redirectWithError(redirectPath, "Generate between 1 and 200 coupons at a time.");
    }
    while (codes.length < quantity) {
      codes = uniqueCodes([...codes, generateCouponCode()]);
    }
  } else {
    const code = normalizeCouponCode(String(formData.get("code") ?? ""));
    if (code.length < 4 || code.length > 64) {
      redirectWithError(redirectPath, "Coupon code must be 4 to 64 characters.");
    }
    codes = [code];
  }

  const hashes = codes.map(couponCodeHash);
  let encryptedCodes: string[];
  try {
    encryptedCodes = codes.map(encryptSecret);
  } catch (error) {
    redirectWithError(
      redirectPath,
      error instanceof Error ? error.message : "Could not encrypt coupon codes."
    );
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("create_ticket_coupons", {
    p_event_id: eventId,
    p_ticket_type_id: ticketTypeId,
    p_code_hashes: hashes,
    p_encrypted_codes: encryptedCodes,
  });

  if (error) {
    redirectWithError(redirectPath, error.message);
  }

  await writeAuditLogSafe(supabase, {
    action: "ticket_coupon.created",
    entityType: "ticket_type",
    entityId: ticketTypeId,
    metadata: {
      event_id: eventId,
      quantity: Array.isArray(data) ? data.length : codes.length,
      mode,
    },
  });

  revalidatePath(redirectPath);
  revalidatePath("/");
  revalidatePath("/attendee/event");
  redirectWithOk(redirectPath);
}

export async function voidTicketCouponAction(formData: FormData) {
  const eventId = String(formData.get("event_id") ?? "").trim();
  const couponId = String(formData.get("coupon_id") ?? "").trim();
  const redirectPath = safeRedirectPath(
    formData.get("redirect_path"),
    eventId ? `/organizer/events/${eventId}/tickets` : "/organizer"
  );

  if (!couponId) {
    redirectWithError(redirectPath, "Missing coupon.");
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("void_ticket_coupon", {
    p_coupon_id: couponId,
  });

  if (error) {
    redirectWithError(redirectPath, error.message);
  }

  await writeAuditLogSafe(supabase, {
    action: "ticket_coupon.voided",
    entityType: "ticket_coupon",
    entityId: couponId,
    metadata: { event_id: eventId },
  });

  revalidatePath(redirectPath);
  revalidatePath("/");
  revalidatePath("/attendee/event");
  redirectWithOk(redirectPath);
}
