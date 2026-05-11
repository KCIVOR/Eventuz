import type { createClient } from "@/lib/supabase/server";
import { expireOwnStaleOrders } from "@/lib/orders/inventory";

type Supabase = Awaited<ReturnType<typeof createClient>>;

/**
 * Marks unpaid holds as expired and reprices early-bird rows whose price lock ended
 * (see migration `expire_stale_unpaid_orders`). Safe to call often.
 * If the RPC is not deployed yet, falls back to updating only the current buyer's rows.
 */
export async function runStaleOrderCleanup(
  supabase: Supabase,
  options?: { buyerUserId?: string | null }
) {
  const { error } = await supabase.rpc("expire_stale_unpaid_orders");
  if (error && options?.buyerUserId) {
    await expireOwnStaleOrders(supabase, options.buyerUserId);
  }
}
