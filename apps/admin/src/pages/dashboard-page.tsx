import { Button, MetricCard, formatMoney } from "@rsc/ui";
import Skeleton from "@mui/material/Skeleton";
import { ArrowDownRight, ArrowUpRight, Clock3 } from "lucide-react";

import { OperationsQueue, type QueueItem } from "../components/operations-queue";
import { PageHeading } from "../components/page-heading";
import { ServiceVolumeChart } from "../components/service-volume-chart";
import { useAdminOverview } from "../hooks/use-admin-overview";
import { useLiveClock } from "../hooks/use-live-clock";

const chartBars = [36, 54, 42, 68, 91, 76, 100, 84, 64, 48, 71, 57] as const;
const chartLegend = ["12pm", "3pm", "6pm", "9pm"] as const;

const queueItems: QueueItem[] = [
  {
    icon: <Clock3 aria-hidden="true" size={18} />,
    label: "6 delayed kitchen tickets",
    detail: "Oldest delay is 17 minutes",
    tone: "danger",
  },
  { icon: "₦", label: "3 settlements need review", detail: "Two periods close today" },
  { icon: "!", label: "1 outlet is paused", detail: "Fire & Spice Lekki" },
];

const outletRows = [
  { name: "Fire & Spice", orders: 128, revenue: "₦2.84m", prep: "24 min", direction: "up" },
  { name: "Garden Bowl", orders: 96, revenue: "₦1.72m", prep: "18 min", direction: "up" },
  { name: "Sweet Room", orders: 75, revenue: "₦1.18m", prep: "31 min", direction: "down" },
] as const;

const CARD_RADIUS = "var(--rsc-radius)";

function MetricSkeleton() {
  return (
    <Skeleton
      variant="rectangular"
      height={110}
      sx={{ borderRadius: CARD_RADIUS, transform: "none" }}
    />
  );
}

export function DashboardPage() {
  const { data: overview, isLoading } = useAdminOverview();
  const clock = useLiveClock();

  const [weekday, datePart] = clock.split(",");
  const kicker = `${weekday},${datePart?.split("·")[0]}`.trim();

  return (
    <>
      <PageHeading
        kicker={kicker}
        title="Good evening. Here's the whole service."
        description={
          overview
            ? `Live figures · last updated ${new Date(overview.generatedAt).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}`
            : "Operational figures are illustrative until the API contract is connected."
        }
        action={<Button>View live orders</Button>}
      />

      <section className="metric-grid" aria-label="Platform overview">
        {isLoading ? (
          <>
            <MetricSkeleton />
            <MetricSkeleton />
            <MetricSkeleton />
            <MetricSkeleton />
          </>
        ) : (
          <>
            <MetricCard
              label="Active outlets"
              value={overview?.activeOutlets ?? "—"}
              detail="All configured outlets"
            />
            <MetricCard
              label="Open master orders"
              value={overview?.openMasterOrders ?? "—"}
              detail="Across active kitchen tickets"
            />
            <MetricCard
              label="Delayed sub-orders"
              value={overview?.delayedSubOrders ?? "—"}
              detail="Needs operations attention"
              tone="warning"
            />
            <MetricCard
              label="Pending settlements"
              value={overview ? formatMoney(overview.pendingSettlements) : "—"}
              detail="Awaiting finance review"
            />
          </>
        )}
      </section>

      <section className="dashboard-grid">
        <ServiceVolumeChart bars={chartBars} legend={chartLegend} />

        <OperationsQueue items={queueItems} />

        <article className="panel panel--full">
          <div className="panel__heading">
            <div>
              <p className="kicker">Outlet performance</p>
              <h2>Today at a glance</h2>
            </div>
            <Button tone="quiet">Open report</Button>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Outlet</th>
                  <th>Orders</th>
                  <th>Revenue</th>
                  <th>Avg. prep</th>
                  <th>Trend</th>
                </tr>
              </thead>
              <tbody>
                {outletRows.map((row) => (
                  <tr key={row.name}>
                    <td>
                      <strong>{row.name}</strong>
                    </td>
                    <td>{row.orders}</td>
                    <td>{row.revenue}</td>
                    <td>{row.prep}</td>
                    <td>
                      <span className={`trend trend--${row.direction}`}>
                        {row.direction === "up" ? (
                          <ArrowUpRight aria-hidden="true" size={16} />
                        ) : (
                          <ArrowDownRight aria-hidden="true" size={16} />
                        )}
                        {row.direction === "up" ? "Healthy" : "Watch"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </article>
      </section>
    </>
  );
}
