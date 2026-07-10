import Skeleton from "@mui/material/Skeleton";
import { Button, EmptyState, MetricCard } from "@rsc/ui";
import { Bike, CalendarDays, Clock3, Plus, Trash2, Trophy } from "lucide-react";
import { useMemo, useState } from "react";

import { RiderOnboardModal } from "../components/rider-onboard-modal";
import { useOrdersFeed } from "../hooks/use-orders-feed";
import type { AdminOrderItem } from "../lib/api";

const REPORT_LIMIT = 100;
const COMPLETED_STATUSES = new Set(["DELIVERED", "CANCELLED"]);

interface RiderReportRow {
  riderId: string;
  activeOrders: number;
  completedDeliveries: number;
  cancelledOrders: number;
  deliveryFeeMinor: number;
  totalMinutes: number;
  measuredDeliveries: number;
  lastCompletedAt: string | null;
}

function getTodayInputDate(): string {
  const now = new Date();
  const offset = now.getTimezoneOffset();
  const local = new Date(now.getTime() - offset * 60_000);

  return local.toISOString().slice(0, 10);
}

function getDateRange(value: string): { dateFrom: string; dateTo: string } {
  return {
    dateFrom: new Date(`${value}T00:00:00`).toISOString(),
    dateTo: new Date(`${value}T23:59:59.999`).toISOString(),
  };
}

function formatCurrency(amountMinor: number): string {
  return `₦${(amountMinor / 100).toLocaleString()}`;
}

function formatDateTime(value: string | null): string {
  if (!value) return "—";

  return new Date(value).toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

function formatMinutes(minutes: number | null): string {
  if (minutes === null) return "—";
  if (minutes < 60) return `${Math.round(minutes)}mins`;

  const hours = Math.floor(minutes / 60);
  const mins = Math.round(minutes % 60);

  return `${hours}h ${mins}m`;
}

function riderLabel(riderId: string): string {
  return `Rider ${riderId.slice(0, 8).toUpperCase()}`;
}

function aggregateRiderReports(orders: AdminOrderItem[]): RiderReportRow[] {
  const rows = new Map<string, RiderReportRow>();

  for (const item of orders) {
    const { order } = item;
    if (!order.riderId || order.deliveryMode !== "DELIVERY") continue;

    const row =
      rows.get(order.riderId) ??
      ({
        riderId: order.riderId,
        activeOrders: 0,
        completedDeliveries: 0,
        cancelledOrders: 0,
        deliveryFeeMinor: 0,
        totalMinutes: 0,
        measuredDeliveries: 0,
        lastCompletedAt: null,
      } satisfies RiderReportRow);

    if (order.status === "DELIVERED") {
      row.completedDeliveries += 1;
      row.deliveryFeeMinor += order.deliveryFeeMinor;

      const createdAt = new Date(order.createdAt).getTime();
      const completedAt = new Date(order.updatedAt).getTime();
      if (Number.isFinite(createdAt) && Number.isFinite(completedAt) && completedAt > createdAt) {
        row.totalMinutes += (completedAt - createdAt) / 60_000;
        row.measuredDeliveries += 1;
      }

      if (!row.lastCompletedAt || order.updatedAt > row.lastCompletedAt) {
        row.lastCompletedAt = order.updatedAt;
      }
    } else if (order.status === "CANCELLED") {
      row.cancelledOrders += 1;
    } else if (!COMPLETED_STATUSES.has(order.status)) {
      row.activeOrders += 1;
    }

    rows.set(order.riderId, row);
  }

  return Array.from(rows.values()).sort((left, right) => {
    if (right.completedDeliveries !== left.completedDeliveries) {
      return right.completedDeliveries - left.completedDeliveries;
    }

    return right.deliveryFeeMinor - left.deliveryFeeMinor;
  });
}

export function RiderReportsPage() {
  const [reportDate, setReportDate] = useState(getTodayInputDate);
  const [onboardOpen, setOnboardOpen] = useState(false);
  const dateRange = useMemo(() => getDateRange(reportDate), [reportDate]);
  const { data, isError, isPending, refetch } = useOrdersFeed({
    deliveryMode: "DELIVERY",
    dateFrom: dateRange.dateFrom,
    dateTo: dateRange.dateTo,
    limit: REPORT_LIMIT,
  });

  const riderRows = useMemo(() => aggregateRiderReports(data?.orders ?? []), [data?.orders]);
  const activeRiderCount = riderRows.filter((row) => row.activeOrders > 0).length;
  const completedDeliveries = riderRows.reduce((total, row) => total + row.completedDeliveries, 0);
  const totalEarnedMinor = riderRows.reduce((total, row) => total + row.deliveryFeeMinor, 0);
  const measuredDeliveries = riderRows.reduce((total, row) => total + row.measuredDeliveries, 0);
  const totalMinutes = riderRows.reduce((total, row) => total + row.totalMinutes, 0);
  const averageMinutes = measuredDeliveries > 0 ? totalMinutes / measuredDeliveries : null;

  return (
    <>
      <RiderOnboardModal open={onboardOpen} onClose={() => setOnboardOpen(false)} />

      <section className="page-heading rider-page-heading py-4">
        <div className="rider-page-heading__copy">
          <div className="rider-page-heading__top">
            <label className="rider-date-filter">
              <CalendarDays aria-hidden="true" size={18} />
              <span className="sr-only">Report date</span>
              <input
                type="date"
                value={reportDate}
                onChange={(event) => setReportDate(event.target.value)}
              />
            </label>
            <Button tone="navy" onClick={() => setOnboardOpen(true)}>
              <Plus aria-hidden="true" size={16} />
              <span className="rider-onboard-label">Onboard Rider</span>
            </Button>
          </div>
        </div>
      </section>

      <section className="metric-grid rider-report-metrics" aria-label="Rider performance summary">
        {isPending ? (
          <>
            <Skeleton
              variant="rectangular"
              height={110}
              sx={{ borderRadius: "var(--rsc-radius)" }}
            />
            <Skeleton
              variant="rectangular"
              height={110}
              sx={{ borderRadius: "var(--rsc-radius)" }}
            />
            <Skeleton
              variant="rectangular"
              height={110}
              sx={{ borderRadius: "var(--rsc-radius)" }}
            />
            <Skeleton
              variant="rectangular"
              height={110}
              sx={{ borderRadius: "var(--rsc-radius)" }}
            />
          </>
        ) : (
          <>
            <MetricCard
              label="Active riders"
              value={activeRiderCount}
              detail="With open delivery orders"
            />
            <MetricCard
              label="Completed deliveries"
              value={completedDeliveries}
              detail="Delivered on selected day"
            />
            <MetricCard
              label="Delivery fees"
              value={formatCurrency(totalEarnedMinor)}
              detail="Rider earnings source currently available"
            />
            <MetricCard
              label="Avg completion"
              value={formatMinutes(averageMinutes)}
              detail="Created-to-delivered estimate"
              tone="warning"
            />
          </>
        )}
      </section>

      <section className="panel rider-directory-panel" aria-labelledby="rider-directory-title">
        <h2 className="sr-only" id="rider-directory-title">
          Visible riders
        </h2>

        {isPending ? (
          <div className="rider-directory-list">
            {Array.from({ length: 3 }).map((_, index) => (
              <Skeleton
                key={index}
                variant="rectangular"
                height={86}
                sx={{ borderRadius: "18px" }}
              />
            ))}
          </div>
        ) : riderRows.length > 0 ? (
          <div className="rider-directory-list">
            {riderRows.map((row) => (
              <article className="rider-directory-card" key={row.riderId}>
                <div className="rider-identity">
                  <span className="rider-rank">{riderLabel(row.riderId).slice(-1)}</span>
                  <span>
                    <strong>{riderLabel(row.riderId)}</strong>
                    <small>{row.riderId}</small>
                  </span>
                </div>
                <div
                  className="rider-directory-meta"
                  aria-label={`${riderLabel(row.riderId)} work summary`}
                >
                  <span>{row.activeOrders} open</span>
                  <span>{row.completedDeliveries} delivered</span>
                </div>
                <button
                  type="button"
                  className="rider-delete-btn"
                  disabled
                  title="Delete will be enabled when the rider directory endpoint returns rider records."
                  aria-label={`Delete ${riderLabel(row.riderId)} unavailable`}
                >
                  <Trash2 aria-hidden="true" size={15} />
                </button>
              </article>
            ))}
          </div>
        ) : (
          <EmptyState icon={<Bike size={30} />} heading="No visible riders for this date" />
        )}
      </section>

      <div className="panel orders-panel rider-report-panel" aria-label="Rider delivery orders">
        {isError ? (
          <div className="panel-state panel-state--error">
            <strong>Rider report is unavailable</strong>
            <p>We could not load the order feed needed for this report.</p>
            <button type="button" onClick={() => void refetch()}>
              Try again
            </button>
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Rider</th>
                  <th>Open work</th>
                  <th>Completed</th>
                  <th>Cancelled</th>
                  <th>Delivery fees</th>
                  <th>Avg completion</th>
                  <th>Last completed</th>
                  <th>Signal</th>
                </tr>
              </thead>
              <tbody>
                {isPending ? (
                  Array.from({ length: 5 }).map((_, rowIndex) => (
                    <tr key={rowIndex}>
                      {Array.from({ length: 8 }).map((_, cellIndex) => (
                        <td key={cellIndex}>
                          <Skeleton variant="text" sx={{ fontSize: "1rem" }} />
                        </td>
                      ))}
                    </tr>
                  ))
                ) : riderRows.length > 0 ? (
                  riderRows.map((row, index) => {
                    const average =
                      row.measuredDeliveries > 0 ? row.totalMinutes / row.measuredDeliveries : null;

                    return (
                      <tr key={row.riderId}>
                        <td>
                          <span className="rider-identity">
                            <span className="rider-rank">{index + 1}</span>
                            <span>
                              <strong>{riderLabel(row.riderId)}</strong>
                              <small>{row.riderId}</small>
                            </span>
                          </span>
                        </td>
                        <td>{row.activeOrders}</td>
                        <td>{row.completedDeliveries}</td>
                        <td>{row.cancelledOrders}</td>
                        <td>{formatCurrency(row.deliveryFeeMinor)}</td>
                        <td>
                          <span className="rider-time-pill">
                            <Clock3 aria-hidden="true" size={14} />
                            {formatMinutes(average)}
                          </span>
                        </td>
                        <td className="order-date-time">{formatDateTime(row.lastCompletedAt)}</td>
                        <td>
                          <span className="rider-signal">
                            <Trophy aria-hidden="true" size={14} />
                            {row.completedDeliveries > 0 ? "Active performer" : "No completions"}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={8} className="table-empty">
                      <EmptyState
                        icon={<Bike size={32} />}
                        heading="No rider activity for this day"
                      />
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {data && data.total > data.limit && (
          <p className="orders-pagination-hint">
            Showing {data.limit} of {data.total} delivery orders. A dedicated rider report endpoint
            should paginate and aggregate this server-side.
          </p>
        )}
      </div>
    </>
  );
}
