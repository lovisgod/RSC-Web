import Skeleton from "@mui/material/Skeleton";
import { Button, EmptyState, MetricCard } from "@rsc/ui";
import { Bike, CalendarDays, Clock3, Info, Pencil, Plus, Trash2, X } from "lucide-react";
import { useMemo, useState, type FormEvent } from "react";
import { createPortal } from "react-dom";
import { updateRiderInputSchema } from "@rsc/contracts";

import { RiderOnboardModal } from "../components/rider-onboard-modal";
import { useOrdersFeed } from "../hooks/use-orders-feed";
import { useDeleteRider, useRiders, useUpdateRider } from "../hooks/use-riders";
import type { AdminOrderItem } from "../lib/api";

const REPORT_LIMIT = 100;
const COMPLETED_STATUSES = new Set(["DELIVERED", "CANCELLED"]);

interface RiderReportRow {
  riderId: string;
  riderName: string;
  isRegistered: boolean;
  plateNumber: string | null;
  riderStatus: string | null;
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

function isRiderOnline(status: string | null): boolean {
  if (!status) return false;

  return ["ACTIVE", "AVAILABLE", "ONLINE"].includes(status.trim().toUpperCase());
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
        riderName: riderLabel(order.riderId),
        isRegistered: false,
        plateNumber: null,
        riderStatus: null,
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

function mergeRidersWithReports(
  riders: NonNullable<ReturnType<typeof useRiders>["data"]>,
  activityRows: RiderReportRow[],
): RiderReportRow[] {
  const rowsByRiderId = new Map(activityRows.map((row) => [row.riderId, row]));
  const merged = riders.map((rider) => {
    const row = rowsByRiderId.get(rider.id);

    rowsByRiderId.delete(rider.id);

    return {
      riderId: rider.id,
      riderName: rider.name,
      isRegistered: true,
      plateNumber: rider.plateNumber ?? row?.plateNumber ?? null,
      riderStatus: rider.riderStatus ?? row?.riderStatus ?? null,
      activeOrders: row?.activeOrders ?? 0,
      completedDeliveries: row?.completedDeliveries ?? 0,
      cancelledOrders: row?.cancelledOrders ?? 0,
      deliveryFeeMinor: row?.deliveryFeeMinor ?? 0,
      totalMinutes: row?.totalMinutes ?? 0,
      measuredDeliveries: row?.measuredDeliveries ?? 0,
      lastCompletedAt: row?.lastCompletedAt ?? null,
    } satisfies RiderReportRow;
  });

  return [...merged, ...rowsByRiderId.values()].sort((left, right) => {
    if (right.completedDeliveries !== left.completedDeliveries) {
      return right.completedDeliveries - left.completedDeliveries;
    }

    if (right.activeOrders !== left.activeOrders) {
      return right.activeOrders - left.activeOrders;
    }

    return left.riderName.localeCompare(right.riderName);
  });
}

function EditRiderPlateModal({
  rider,
  onClose,
}: {
  rider: Pick<RiderReportRow, "riderId" | "riderName" | "plateNumber">;
  onClose: () => void;
}) {
  const [plateNumber, setPlateNumber] = useState(rider.plateNumber ?? "");
  const [error, setError] = useState<string | null>(null);
  const { mutate, isPending } = useUpdateRider();

  function close() {
    if (!isPending) onClose();
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsed = updateRiderInputSchema.safeParse({ plateNumber: plateNumber.trim() });

    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Enter a valid plate number.");
      return;
    }

    setError(null);
    mutate(
      { id: rider.riderId, input: { plateNumber: parsed.data.plateNumber } },
      { onSuccess: onClose },
    );
  }

  return createPortal(
    <div className="modal-overlay" aria-hidden="true" onClick={close}>
      <div
        className="modal modal--edit-rider"
        role="dialog"
        aria-modal="true"
        aria-labelledby="edit-rider-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="modal__head">
          <div>
            <span className="modal-kicker">Rider operations</span>
            <h2 id="edit-rider-title">Edit plate number</h2>
          </div>
          <button type="button" className="modal__close" aria-label="Close" onClick={close}>
            <X size={18} />
          </button>
        </div>

        <form className="modal__body" onSubmit={submit} noValidate>
          <p className="text-sm text-gray-500">
            Update the plate number for <strong>{rider.riderName}</strong>.
          </p>
          <label className="field-label">
            <span className="field-label__row">
              Plate Number *
              <span
                className="field-info-icon"
                title="This must match the GPS IoT platform DeviceName."
                aria-label="The plate number must match the GPS IoT DeviceName."
              >
                <Info size={14} aria-hidden="true" />
              </span>
            </span>
            <input
              className="field-input"
              value={plateNumber}
              onChange={(event) => setPlateNumber(event.target.value)}
              placeholder="ABC-123XY"
              autoFocus
              required
            />
            <small className="field-hint">Must match the GPS IoT platform DeviceName.</small>
            {error && <small className="field-error">{error}</small>}
          </label>
          <div className="modal__actions">
            <Button tone="quiet" type="button" onClick={close} disabled={isPending}>
              Cancel
            </Button>
            <Button tone="navy" type="submit" disabled={isPending || !plateNumber.trim()}>
              {isPending ? "Saving..." : "Save plate number"}
            </Button>
          </div>
        </form>
      </div>
    </div>,
    document.body,
  );
}

function DeleteRiderModal({
  rider,
  isDeleting,
  onCancel,
  onConfirm,
}: {
  rider: Pick<RiderReportRow, "riderId" | "riderName">;
  isDeleting: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="modal-overlay" aria-hidden="true" onClick={onCancel}>
      <div
        className="modal modal--delete-rider"
        role="dialog"
        aria-modal="true"
        aria-labelledby="delete-rider-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="modal__head">
          <div>
            <span className="modal-kicker">Confirm action</span>
            <h2 id="delete-rider-title">Delete rider?</h2>
          </div>
        </div>

        <div className="modal__body">
          <div className="delete-confirmation-card">
            <div className="delete-confirmation-card__icon">
              <Trash2 aria-hidden="true" size={22} />
            </div>
            <div>
              <strong>{rider.riderName}</strong>
              <p>
                This removes the rider from the admin rider list. Existing order history remains
                available for reporting.
              </p>
            </div>
          </div>

          <div className="modal__actions">
            <Button tone="quiet" type="button" onClick={onCancel} disabled={isDeleting}>
              Cancel
            </Button>
            <Button tone="navy" type="button" onClick={onConfirm} disabled={isDeleting}>
              {isDeleting ? "Deleting..." : "Delete Rider"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function RiderReportsPage() {
  const [reportDate, setReportDate] = useState(getTodayInputDate);
  const [onboardOpen, setOnboardOpen] = useState(false);
  const [riderToEdit, setRiderToEdit] = useState<Pick<
    RiderReportRow,
    "riderId" | "riderName" | "plateNumber"
  > | null>(null);
  const [riderToDelete, setRiderToDelete] = useState<Pick<
    RiderReportRow,
    "riderId" | "riderName"
  > | null>(null);
  const dateRange = useMemo(() => getDateRange(reportDate), [reportDate]);
  const { data, isError, isPending, refetch } = useOrdersFeed({
    deliveryMode: "DELIVERY",
    dateFrom: dateRange.dateFrom,
    dateTo: dateRange.dateTo,
    limit: REPORT_LIMIT,
  });

  const { data: ridersData, isPending: isRidersPending } = useRiders();
  const { mutate: deleteRiderMutate, isPending: isDeletePending } = useDeleteRider();

  const activityRows = useMemo(() => aggregateRiderReports(data?.orders ?? []), [data?.orders]);
  const riderRows = useMemo(
    () => mergeRidersWithReports(ridersData ?? [], activityRows),
    [activityRows, ridersData],
  );
  const activeRiderCount = riderRows.filter((row) => row.activeOrders > 0).length;
  const completedDeliveries = riderRows.reduce((total, row) => total + row.completedDeliveries, 0);
  const totalEarnedMinor = riderRows.reduce((total, row) => total + row.deliveryFeeMinor, 0);
  const measuredDeliveries = riderRows.reduce((total, row) => total + row.measuredDeliveries, 0);
  const totalMinutes = riderRows.reduce((total, row) => total + row.totalMinutes, 0);
  const averageMinutes = measuredDeliveries > 0 ? totalMinutes / measuredDeliveries : null;

  return (
    <>
      <RiderOnboardModal open={onboardOpen} onClose={() => setOnboardOpen(false)} />
      {riderToEdit && (
        <EditRiderPlateModal rider={riderToEdit} onClose={() => setRiderToEdit(null)} />
      )}
      {riderToDelete && (
        <DeleteRiderModal
          rider={riderToDelete}
          isDeleting={isDeletePending}
          onCancel={() => {
            if (!isDeletePending) setRiderToDelete(null);
          }}
          onConfirm={() =>
            deleteRiderMutate(riderToDelete.riderId, {
              onSuccess: () => setRiderToDelete(null),
            })
          }
        />
      )}

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
        {isPending || isRidersPending ? (
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
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {isPending || isRidersPending ? (
                  Array.from({ length: 5 }).map((_, rowIndex) => (
                    <tr key={rowIndex}>
                      {Array.from({ length: 9 }).map((_, cellIndex) => (
                        <td key={cellIndex}>
                          <Skeleton variant="text" sx={{ fontSize: "1rem" }} />
                        </td>
                      ))}
                    </tr>
                  ))
                ) : riderRows.length > 0 ? (
                  riderRows.map((row) => {
                    const average =
                      row.measuredDeliveries > 0 ? row.totalMinutes / row.measuredDeliveries : null;
                    const online = isRiderOnline(row.riderStatus);

                    return (
                      <tr key={row.riderId}>
                        <td>
                          <span className="rider-identity">
                            <span
                              className={`rider-status-dot${online ? " rider-status-dot--online" : ""}`}
                              aria-label={online ? "Rider online" : "Rider offline"}
                              title={online ? "Online" : "Offline"}
                            />
                            <span>
                              <strong>{row.riderName}</strong>
                              <small>{row.plateNumber ?? "No plate number"}</small>
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
                            {formatMinutes(average ?? 0)}
                          </span>
                        </td>
                        <td className="order-date-time">{formatDateTime(row.lastCompletedAt)}</td>
                        <td>
                          <span className="rider-signal">
                            <Bike aria-hidden="true" size={14} />
                            {online ? "Available" : "Unavailable"}
                          </span>
                        </td>
                        <td>
                          {row.isRegistered ? (
                            <span className="outlet-detail-page__actions">
                              <button
                                type="button"
                                className="outlet-icon-btn outlet-icon-btn--edit"
                                onClick={() =>
                                  setRiderToEdit({
                                    riderId: row.riderId,
                                    riderName: row.riderName,
                                    plateNumber: row.plateNumber,
                                  })
                                }
                                title={`Edit ${row.riderName} plate number`}
                                aria-label={`Edit ${row.riderName} plate number`}
                              >
                                <Pencil aria-hidden="true" size={15} />
                              </button>
                              <button
                                type="button"
                                className="rider-delete-btn"
                                onClick={() =>
                                  setRiderToDelete({
                                    riderId: row.riderId,
                                    riderName: row.riderName,
                                  })
                                }
                                disabled={isDeletePending}
                                title={`Delete ${row.riderName}`}
                                aria-label={`Delete ${row.riderName}`}
                              >
                                <Trash2 aria-hidden="true" size={15} />
                              </button>
                            </span>
                          ) : (
                            <span className="text-gray-400" title="Historical rider record">
                              —
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={9} className="table-empty">
                      <EmptyState icon={<Bike size={32} />} heading="No visible riders" />
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
