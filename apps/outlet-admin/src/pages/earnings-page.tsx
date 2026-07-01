import { EarningsChart } from "../components/earnings-chart";
import { OutletPageHeader } from "../components/outlet-page-header";
import { useAuth } from "../hooks/use-auth";
import { useOrdersQueue } from "../hooks/use-orders-queue";

function formatNaira(minor: number) {
  if (minor === 0) return "₦0";
  return `₦${(minor / 100).toLocaleString("en-NG")}`;
}

function MetricCard({
  label,
  value,
  valueClass = "text-slate-900",
}: {
  label: string;
  value: string | number;
  valueClass?: string;
}) {
  return (
    <div className="rounded-xl border border-slate-100 bg-white p-5 shadow-sm">
      <p className="text-xs font-bold uppercase tracking-widest text-slate-400">{label}</p>
      <p className={`mt-3 text-3xl font-black tabular-nums ${valueClass}`}>{value}</p>
    </div>
  );
}

const RSC_COMMISSION_RATE = 0.15;

export function EarningsPage() {
  const { user } = useAuth();
  const outletId = user?.outletId ?? "";
  const { data: orders = [] } = useOrdersQueue(outletId);

  const completed = orders.filter((o) => o.status === "COLLECTED" || o.status === "DISPATCHED");
  const grossMinor = completed.reduce((sum, o) => sum + o.totalAmountMinor, 0);
  const commissionMinor = Math.round(grossMinor * RSC_COMMISSION_RATE);
  const netMinor = grossMinor - commissionMinor;

  return (
    <div>
      <OutletPageHeader />

      <div className="px-6 pb-6">
        <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
          <MetricCard label="Completed Orders" value={completed.length} />
          <MetricCard label="Gross Revenue" value={formatNaira(grossMinor)} />
          <MetricCard label="RSC Commission (15%)" value={formatNaira(commissionMinor)} />
          <MetricCard
            label="Net Payout Amount"
            value={formatNaira(netMinor)}
            valueClass="text-emerald-600"
          />
        </div>

        <EarningsChart />
      </div>
    </div>
  );
}
