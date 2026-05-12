import { ScrollableTableWrapper } from "@/components/ui/ScrollableTableWrapper";

type AvailabilityRow = {
  ticket_type_id: string;
  name: string;
  type_status: string;
  capacity: number;
  available_for_sale: number;
};

type Props = {
  availability: AvailabilityRow[];
};

export function DashboardAvailabilityTable({ availability }: Props) {
  return (
    <ScrollableTableWrapper>
      <table className="w-full min-w-[520px] text-left text-sm">
        <thead>
          <tr className="border-b border-border bg-muted/40 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            <th className="px-4 py-3">Type</th>
            <th className="px-4 py-3">Status</th>
            <th className="px-4 py-3 text-right">Capacity</th>
            <th className="px-4 py-3 text-right">Available to sell</th>
          </tr>
        </thead>
        <tbody>
          {availability.length === 0 ? (
            <tr>
              <td className="px-4 py-6 text-muted-foreground" colSpan={4}>
                No ticket types yet.
              </td>
            </tr>
          ) : (
            availability.map((row) => (
              <tr key={row.ticket_type_id} className="border-b border-border/80 last:border-b-0">
                <td className="px-4 py-3 font-medium text-foreground">{row.name}</td>
                <td className="px-4 py-3 text-muted-foreground">{row.type_status}</td>
                <td className="px-4 py-3 text-right tabular-nums text-foreground">
                  {row.capacity}
                </td>
                <td className="px-4 py-3 text-right tabular-nums text-foreground">
                  {row.available_for_sale}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </ScrollableTableWrapper>
  );
}
