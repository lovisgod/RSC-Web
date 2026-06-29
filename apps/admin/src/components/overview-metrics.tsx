import { MetricCard, formatMoney } from "@rsc/ui";

interface Money {
  amountMinor: number;
  currency: "NGN";
}

export interface OverviewData {
  activeOutlets: number;
  openMasterOrders: number;
  delayedSubOrders: number;
  pendingSettlements: Money;
}

export function OverviewMetrics({ data }: { data: OverviewData }) {
  return (
    <section className="metric-grid" aria-label="Platform overview">
      <MetricCard
        label="Active outlets"
        value={data.activeOutlets}
        detail="All configured outlets"
      />
      <MetricCard
        label="Open master orders"
        value={data.openMasterOrders}
        detail="Across 63 kitchen tickets"
      />
      <MetricCard
        label="Delayed sub-orders"
        value={data.delayedSubOrders}
        detail="Needs operations attention"
        tone="warning"
      />
      <MetricCard
        label="Pending settlements"
        value={formatMoney(data.pendingSettlements)}
        detail="Awaiting finance review"
      />
    </section>
  );
}
