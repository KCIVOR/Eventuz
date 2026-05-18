"use server";

import { createClient } from "@/lib/supabase/server";

export type BuyerInsightData = {
  profile: {
    id: string;
    full_name: string;
    email: string | null;
    phone_number: string | null;
    bio: string | null;
    organization_name: string | null;
    avatar_url: string | null;
    address: string | null;
    created_at: string;
  };
  orders: {
    id: string;
    created_at: string;
    status: string;
    total_amount: number;
    event_name: string;
    event_date: string;
    ticket_type_name: string;
    quantity: number;
  }[];
  payments: {
    id: string;
    created_at: string;
    amount: number;
    currency: string;
    status: string;
    provider: string;
    provider_payment_id: string | null;
    provider_checkout_id: string | null;
  }[];
};

export async function loadBuyerInsight(buyerUserId: string): Promise<{ ok: true; data: BuyerInsightData } | { ok: false; reason: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, reason: "Unauthorized" };

  // Fetch Profile
  const { data: profile, error: profErr } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", buyerUserId)
    .maybeSingle();

  if (profErr || !profile) return { ok: false, reason: "Buyer profile not found" };

  // Fetch Orders with Event and Ticket Type details
  const { data: ordersRaw, error: ordErr } = await supabase
    .from("orders")
    .select(`
      id, created_at, status, total_amount, quantity,
      events ( name, event_date ),
      ticket_types ( name )
    `)
    .eq("buyer_user_id", buyerUserId)
    .order("created_at", { ascending: false });

  if (ordErr) return { ok: false, reason: "Failed to load purchase history" };

  // Fetch Payments linked to those orders
  const orderIds = ordersRaw?.map(o => o.id) || [];
  const { data: paymentsRaw, error: payErr } = orderIds.length > 0 
    ? await supabase
        .from("payments")
        .select("*")
        .in("order_id", orderIds)
        .order("created_at", { ascending: false })
    : { data: [], error: null };

  if (payErr) return { ok: false, reason: "Failed to load transaction history" };

  const orders = (ordersRaw ?? []).map((o: any) => ({
    id: o.id,
    created_at: o.created_at,
    status: o.status,
    total_amount: Number(o.total_amount),
    event_name: o.events?.name || "Unknown Event",
    event_date: o.events?.event_date || "",
    ticket_type_name: o.ticket_types?.name || "—",
    quantity: o.quantity,
  }));

  const payments = (paymentsRaw ?? []).map((p: any) => ({
    id: p.id,
    created_at: p.created_at,
    amount: Number(p.amount),
    currency: p.currency,
    status: p.status,
    provider: p.provider,
    provider_payment_id: p.provider_payment_id,
    provider_checkout_id: p.provider_checkout_id,
  }));

  return {
    ok: true,
    data: {
      profile: profile as any,
      orders,
      payments,
    }
  };
}
