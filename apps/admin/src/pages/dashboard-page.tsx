import Skeleton from "@mui/material/Skeleton";
import type { OrderPulseRange } from "@rsc/contracts";
import { Button, MetricCard } from "@rsc/ui";
import { AlertTriangle, ArrowRight, PauseCircle } from "lucide-react";
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";

import { OperationsQueue, type QueueItem } from "../components/operations-queue";
import { PageHeading } from "../components/page-heading";
import { ServiceVolumeChart } from "../components/service-volume-chart";
import { useOrdersFeed } from "../hooks/use-orders-feed";
import {
  useOperationsQueue,
  useOperationsSummary,
  useOrderPulse,
} from "../hooks/use-operations-stats";
import { useOutletsLive } from "../hooks/use-outlets-live";
import { useLiveClock } from "../hooks/use-live-clock";
import type { AdminOrderItem } from "../lib/api";

const CARD_RADIUS = "var(--rsc-radius)";
const PERFORMANCE_LIMIT = 100;
const COMPLETED_SUB_ORDER_STATUSES = new Set(["COLLECTED", "DISPATCHED"]);
const IN_PROGRESS_SUB_ORDER_STATUSES = new Set(["ACCEPTED", "PREPARING", "READY"]);

function formatDelayDuration(totalMinutes: number) {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

interface OutletPerformanceRow {
  outletId: string;
  outletName: string;
  isOnline: boolean;
  volume: number;
  completed: number;
  inProgress: number;
  pendingApproval: number;
  rejected: number;
}

function MetricSkeleton() {
  return (
    <Skeleton
      variant="rectangular"
      height={110}
      sx={{ borderRadius: CARD_RADIUS, transform: "none" }}
    />
  );
}

function buildOutletPerformanceRows(
  orders: AdminOrderItem[],
  outlets: Array<{ id: string; name: string; isOnline: boolean }>,
): OutletPerformanceRow[] {
  const rows = new Map<string, OutletPerformanceRow>();

  outlets.forEach((outlet) => {
    rows.set(outlet.id, {
      outletId: outlet.id,
      outletName: outlet.name,
      isOnline: outlet.isOnline,
      volume: 0,
      completed: 0,
      inProgress: 0,
      pendingApproval: 0,
      rejected: 0,
    });
  });

  orders.forEach(({ order, subOrders }) => {
    if (order.status === "PENDING_PAYMENT") return;

    subOrders.forEach((subOrder) => {
      const row =
        rows.get(subOrder.outletId) ??
        ({
          outletId: subOrder.outletId,
          outletName: `Outlet ${subOrder.outletId.slice(0, 8)}`,
          isOnline: false,
          volume: 0,
          completed: 0,
          inProgress: 0,
          pendingApproval: 0,
          rejected: 0,
        } satisfies OutletPerformanceRow);

      row.volume += 1;

      if (COMPLETED_SUB_ORDER_STATUSES.has(subOrder.status)) {
        row.completed += 1;
      } else if (IN_PROGRESS_SUB_ORDER_STATUSES.has(subOrder.status)) {
        row.inProgress += 1;
      } else if (subOrder.status === "PENDING") {
        row.pendingApproval += 1;
      } else if (subOrder.status === "REJECTED") {
        row.rejected += 1;
      }

      rows.set(subOrder.outletId, row);
    });
  });

  return Array.from(rows.values()).sort((left, right) => {
    if (right.volume !== left.volume) return right.volume - left.volume;
    if (right.inProgress !== left.inProgress) return right.inProgress - left.inProgress;
    return left.outletName.localeCompare(right.outletName);
  });
}

function OutletPerformanceTable({
  rows,
  isLoading,
  isError,
  onRetry,
}: {
  rows: OutletPerformanceRow[];
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
}) {
  return (
    <article className="panel panel--full outlet-performance-panel">
      <div className="panel__heading">
        <div>
          <p className="kicker">Outlet performance</p>
          <h2>Order handling by outlet</h2>
          <p className="outlet-performance-panel__copy">
            Operational volume only: completed, active, pending approval, and rejected outlet work.
          </p>
        </div>
        {isError && (
          <Button tone="quiet" onClick={onRetry}>
            Retry
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="outlet-performance-skeleton">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton
              key={index}
              variant="rectangular"
              height={58}
              sx={{ borderRadius: "14px", transform: "none" }}
            />
          ))}
        </div>
      ) : rows.length > 0 ? (
        <div className="outlet-performance-table-wrap">
          <table className="outlet-performance-table">
            <thead>
              <tr>
                <th>Outlet</th>
                <th>Volume</th>
                <th>Completed</th>
                <th>In progress</th>
                <th>Pending approval</th>
                <th>Rejected</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.outletId}>
                  <td>
                    <div className="outlet-performance-name">
                      <span
                        className={`outlet-performance-dot${
                          row.isOnline ? " outlet-performance-dot--online" : ""
                        }`}
                        aria-hidden="true"
                      />
                      <strong>{row.outletName}</strong>
                    </div>
                  </td>
                  <td>{row.volume}</td>
                  <td>{row.completed}</td>
                  <td>{row.inProgress}</td>
                  <td>{row.pendingApproval}</td>
                  <td>
                    <span className={row.rejected > 0 ? "outlet-performance-rejected" : ""}>
                      {row.rejected}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="data-placeholder data-placeholder--compact">
          <div>
            <p className="kicker">Outlet performance</p>
            <h2>No outlet activity yet</h2>
            <p>Paid outlet order activity will appear here as outlets start handling orders.</p>
          </div>
        </div>
      )}
    </article>
  );
}

export function DashboardPage() {
  const [pulseRange, setPulseRange] = useState<OrderPulseRange>("TODAY");
  const summary = useOperationsSummary();
  const pulse = useOrderPulse(pulseRange);
  const queue = useOperationsQueue();
  const outletOrders = useOrdersFeed({ limit: PERFORMANCE_LIMIT });
  const outlets = useOutletsLive();
  const clock = useLiveClock();

  const [weekday, datePart] = clock.split(",");
  const kicker = `${weekday},${datePart?.split("·")[0]}`.trim();
  const latestUpdate = Math.max(summary.dataUpdatedAt, pulse.dataUpdatedAt, queue.dataUpdatedAt);

  const queueItems: QueueItem[] = [];
  if (queue.data?.delayedKitchenTickets) {
    queueItems.push({
      icon: <AlertTriangle aria-hidden="true" size={18} />,
      label: `${queue.data.delayedKitchenTickets} delayed kitchen ${
        queue.data.delayedKitchenTickets === 1 ? "ticket" : "tickets"
      }`,
      detail:
        queue.data.oldestDelayMinutes === null
          ? "Delay age is not available"
          : `Oldest delay is ${formatDelayDuration(queue.data.oldestDelayMinutes)} mins`,
      tone: "danger",
    });
  }
  if (queue.data?.pausedOutlets) {
    queueItems.push({
      icon: <PauseCircle aria-hidden="true" size={18} />,
      label: `${queue.data.pausedOutlets} paused ${
        queue.data.pausedOutlets === 1 ? "outlet" : "outlets"
      }`,
      detail: "Currently unavailable to customers",
    });
  }
  const outletPerformanceRows = useMemo(
    () => buildOutletPerformanceRows(outletOrders.data?.orders ?? [], outlets.data ?? []),
    [outletOrders.data?.orders, outlets.data],
  );

  return (
    <>
      <PageHeading
        kicker={kicker}
        title="Good evening. Here's the whole service."
        description={
          latestUpdate > 0
            ? `Live operational figures · updated ${new Date(latestUpdate).toLocaleTimeString(
                "en-GB",
                { hour: "2-digit", minute: "2-digit" },
              )}`
            : "Live operational figures refresh every 30 seconds."
        }
        action={
          <Link className="live-orders-cta" to="/orders">
            <span>View live orders</span>
            <ArrowRight aria-hidden="true" size={18} />
          </Link>
        }
      />

      {summary.isError && (
        <section className="live-board-error" role="alert">
          <div>
            <strong>Platform summary is unavailable</strong>
            <p>We could not load the current operational totals.</p>
          </div>
          <Button tone="quiet" onClick={() => void summary.refetch()}>
            Try again
          </Button>
        </section>
      )}

      <section className="metric-grid" aria-label="Platform operations summary">
        {summary.isPending ? (
          <>
            <MetricSkeleton />
            <MetricSkeleton />
            <MetricSkeleton />
          </>
        ) : summary.data ? (
          <>
            <MetricCard
              label="Active outlets"
              value={summary.data.activeOutlets}
              detail="Currently accepting orders"
            />
            <MetricCard
              label="Open master orders"
              value={summary.data.openMasterOrders}
              detail="Not delivered or cancelled"
            />
            <MetricCard
              label="Delayed sub-orders"
              value={summary.data.delayedSubOrders}
              detail="Kitchen tickets delayed over 15 minutes"
              tone="warning"
            />
          </>
        ) : null}
        <MetricCard label="Pending settlements" value="—" detail="Finance endpoint coming soon" />
      </section>

      <section className="dashboard-grid">
        <ServiceVolumeChart
          points={pulse.data?.points ?? []}
          range={pulseRange}
          isLoading={pulse.isPending}
          isError={pulse.isError}
          onRangeChange={setPulseRange}
          onRetry={() => void pulse.refetch()}
        />

        <OperationsQueue
          items={queueItems}
          isLoading={queue.isPending}
          isError={queue.isError}
          onRetry={() => void queue.refetch()}
        />

        <OutletPerformanceTable
          rows={outletPerformanceRows}
          isLoading={outletOrders.isPending || outlets.isPending}
          isError={outletOrders.isError || outlets.isError}
          onRetry={() => {
            void outletOrders.refetch();
            void outlets.refetch();
          }}
        />
      </section>
    </>
  );
}
