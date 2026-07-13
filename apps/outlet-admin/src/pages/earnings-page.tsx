import { EarningsChart } from "../components/earnings-chart";
import { OutletPageHeader } from "../components/outlet-page-header";
import { useAuth } from "../hooks/use-auth";
import { useOrdersQueue } from "../hooks/use-orders-queue";

const COMPLETED_STATUSES = ["COLLECTED", "DISPATCHED"] as const;

function formatNaira(minor: number) {
  if (minor === 0) return "₦0";
  return `₦${(minor / 100).toLocaleString("en-NG")}`;
}

function MetricCard({
  label,
  value,
  helper,
  valueClass = "text-slate-900",
}: {
  label: string;
  value: string | number;
  helper: string;
  valueClass?: string;
}) {
  return (
    <div className="min-w-0 rounded-2xl bg-white px-5 py-4 shadow-sm ring-1 ring-slate-100">
      <p className="text-xs font-bold uppercase tracking-widest text-slate-400">{label}</p>
      <p className={`mt-3 text-2xl font-black tabular-nums lg:text-3xl ${valueClass}`}>{value}</p>
      <p className="mt-2 text-sm leading-5 text-slate-500">{helper}</p>
    </div>
  );
}

export function EarningsPage() {
  const { user } = useAuth();
  const outletId = user?.outletId ?? "";
  const { data: orders = [] } = useOrdersQueue(outletId);

  const paidOrders = orders.filter((order) => order.masterOrderStatus !== "PENDING_PAYMENT");
  const completed = paidOrders.filter((order) =>
    COMPLETED_STATUSES.some((status) => status === order.status),
  );
  const grossMinor = completed.reduce((sum, order) => sum + order.totalAmountMinor, 0);
  const totalRevenueMinor = paidOrders.reduce((sum, order) => sum + order.totalAmountMinor, 0);
  const transactions = [...paidOrders]
    .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime())
    .map((order) => ({
      id: order.id,
      code: order.pickupCode ?? order.deliveryCode,
      status: order.status,
      amountMinor: order.totalAmountMinor,
      items: order.items.map((item) => ({
        name: item.name,
        quantity: item.quantity,
      })),
      createdAt: order.createdAt,
    }));

  return (
    <div>
      <OutletPageHeader />

      <main className="px-6 pb-6">
        <div className="mb-6">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400">
            Finance desk
          </p>
          <h1 className="mt-1 text-2xl font-black tracking-tight text-slate-950">
            Earnings & Payouts
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
            A clean view of today&apos;s outlet value, order movement, and what is ready for payout.
          </p>
        </div>

        <div className="mb-6 grid gap-3 rounded-3xl border border-slate-100 bg-slate-50/70 p-2 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            label="Completed orders"
            value={completed.length.toLocaleString("en-NG")}
            helper="Fulfilled outlet orders."
          />
          <MetricCard
            label="Total orders"
            value={paidOrders.length.toLocaleString("en-NG")}
            helper="Orders with successful payment."
            valueClass="text-[var(--rsc-main)]"
          />
          <MetricCard
            label="Completed revenue"
            value={formatNaira(grossMinor)}
            helper="Value ready from completed orders."
          />
          <MetricCard
            label="Total revenue"
            value={formatNaira(totalRevenueMinor)}
            helper="Tracks all revenue from paid outlet orders."
            valueClass="text-[var(--rsc-main)]"
          />
        </div>

        <EarningsChart dateLabel="Successful payments" transactions={transactions} />
      </main>
    </div>
  );
}
