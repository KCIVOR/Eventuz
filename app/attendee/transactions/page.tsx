import { loadAttendeeTransactions } from "@/lib/attendee/transactions";
import { AttendeeTransactionHistory } from "@/components/attendee/AttendeeTransactionHistory";
import { RoleAreaShell } from "@/components/layout/RoleAreaShell";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Transaction History · Eventuz",
};

type Props = {
  searchParams: Promise<{
    status?: string;
    page?: string;
  }>;
};

export default async function AttendeeTransactionsPage({ searchParams }: Props) {
  const q = await searchParams;
  const status = q.status || "";
  const page = Number(q.page) || 1;

  const { transactions, total } = await loadAttendeeTransactions({
    search: "", // Search logic can be added later if needed
    status,
    page,
  });

  return (
    <RoleAreaShell
      role="attendee"
      title="Transaction History"
      showPageHeader={false}
      compactTitle="Transaction History"
      layout="flush"
      mainWidth="wide"
    >
      <div className="mx-auto w-full max-w-6xl p-4 sm:p-10">
        <AttendeeTransactionHistory
          transactions={transactions}
          total={total}
          page={page}
          filterState={{ search: "", status, page }}
          pathname="/attendee/transactions"
        />
      </div>
    </RoleAreaShell>
  );
}
