import Skeleton from "@mui/material/Skeleton";
import type { OrderPulseRange } from "@rsc/contracts";
import { Button, MetricCard } from "@rsc/ui";
import { AlertTriangle, ArrowRight, BarChart3, PauseCircle } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";

import { OperationsQueue, type QueueItem } from "../components/operations-queue";
import { PageHeading } from "../components/page-heading";
import { ServiceVolumeChart } from "../components/service-volume-chart";
import {
  useOperationsQueue,
  useOperationsSummary,
  useOrderPulse,
} from "../hooks/use-operations-stats";
import { useLiveClock } from "../hooks/use-live-clock";

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
  const [pulseRange, setPulseRange] = useState<OrderPulseRange>("TODAY");
  const summary = useOperationsSummary();
  const pulse = useOrderPulse(pulseRange);
  const queue = useOperationsQueue();
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
          : `Oldest delay is ${queue.data.oldestDelayMinutes} minutes`,
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

        <article className="panel panel--full data-placeholder">
          <span className="data-placeholder__icon">
            <BarChart3 aria-hidden="true" size={24} />
          </span>
          <div>
            <p className="kicker">Outlet performance</p>
            <h2>Performance reporting is coming soon</h2>
            <p>
              Orders, revenue, preparation time, and outlet trends will appear here when the
              reporting endpoint is available.
            </p>
          </div>
          <span className="data-placeholder__badge">Awaiting endpoint</span>
        </article>
      </section>
    </>
  );
}
