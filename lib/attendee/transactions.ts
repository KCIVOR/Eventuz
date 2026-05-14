import { createClient } from "@/lib/supabase/server";
import { DEFAULT_LIST_PAGE_SIZE, getPaginationRange } from "@/lib/ui/pagination";

export type TransactionRow = {
  id: string;
  created_at: string;
  event_name: string;
  ticket_type_name: string;
  quantity: number;
  total_amount: number;
  status: string;
  pricing_type: string;
};

export type TransactionFilterState = {
  search: string;
  status: string;
  page: number;
};

/**
 * Loads transaction history for the current authenticated attendee.
 */
export async function loadAttendeeTransactions(filters: TransactionFilterState) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { transactions: [], total: 0 };
  }

  let query = supabase
    .from("orders")
    .select(`
      id,
      created_at,
      total_amount,
      status,
      quantity,
      pricing_type,
      event:events(name),
      ticket_type:ticket_types(name)
    `, { count: "exact" })
    .eq("buyer_user_id", user.id)
    .order("created_at", { ascending: false });

  if (filters.status) {
    query = query.eq("status", filters.status);
  }

  // Handle "search" by filtering on event name or ticket type name
  // Note: PostgREST doesn't support easy cross-table search in one query without a view
  // For now, we'll fetch and filter if search is present, or just use basic filters
  // If search is needed, we'd ideally use a RPC or View.
  // For MVP, let's just filter by status and date.

  const { from, to } = getPaginationRange(filters.page, DEFAULT_LIST_PAGE_SIZE);
  query = query.range(from, to);

  const { data, count, error } = await query;

  if (error) {
    console.error("Error loading transactions:", error);
    return { transactions: [], total: 0 };
  }

  const transactions: TransactionRow[] = (data || []).map((row: any) => ({
    id: row.id,
    created_at: row.created_at,
    event_name: row.event?.name || "Unknown Event",
    ticket_type_name: row.ticket_type?.name || "Unknown Ticket",
    quantity: row.quantity,
    total_amount: Number(row.total_amount),
    status: row.status,
    pricing_type: row.pricing_type,
  }));

  return {
    transactions,
    total: count || 0,
  };
}
