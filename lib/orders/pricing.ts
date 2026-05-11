export type PricingResult = {
  unitPrice: number;
  pricingType: "regular" | "early_bird";
};

export function resolveUnitPrice(params: {
  regularPrice: number;
  earlyBirdPrice: number;
  earlyBirdStartAt: string | null;
  earlyBirdEndAt: string | null;
  at: Date;
}): PricingResult {
  const { regularPrice, earlyBirdPrice, earlyBirdStartAt, earlyBirdEndAt, at } = params;
  const t = at.getTime();
  if (earlyBirdStartAt && earlyBirdEndAt) {
    const start = new Date(earlyBirdStartAt).getTime();
    const end = new Date(earlyBirdEndAt).getTime();
    if (!Number.isNaN(start) && !Number.isNaN(end) && t >= start && t <= end) {
      return { unitPrice: earlyBirdPrice, pricingType: "early_bird" };
    }
  }
  return { unitPrice: regularPrice, pricingType: "regular" };
}

/** Upper bound for early-bird price lock: min(early_bird_hold window, calendar early-bird end). */
export function computeEarlyBirdPriceLockExpiresAt(params: {
  pricingType: "regular" | "early_bird";
  earlyBirdEndAt: string | null;
  earlyBirdHoldMinutes: number;
  at: Date;
}): string | null {
  if (params.pricingType !== "early_bird") return null;
  const holdEnd = params.at.getTime() + params.earlyBirdHoldMinutes * 60 * 1000;
  if (params.earlyBirdEndAt) {
    const calendarEnd = new Date(params.earlyBirdEndAt).getTime();
    if (!Number.isNaN(calendarEnd)) {
      return new Date(Math.min(holdEnd, calendarEnd)).toISOString();
    }
  }
  return new Date(holdEnd).toISOString();
}
