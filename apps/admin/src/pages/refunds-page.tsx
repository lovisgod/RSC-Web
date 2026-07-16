import Skeleton from "@mui/material/Skeleton";
import { Button } from "@rsc/ui";
import type { RefundRequestItem } from "@rsc/contracts";
import {
  ArrowLeft,
  ArrowRight,
  Banknote,
  CheckCircle2,
  ClipboardList,
  Eye,
  RefreshCw,
  Search,
  X,
} from "lucide-react";
import { useMemo, useState } from "react";

import { useProcessRefundRequest, useRefundRequests } from "../hooks/use-refund-requests";

const PAGE_SIZE = 20;
const TABLE_COLUMNS = 5;

const moneyFormatter = new Intl.NumberFormat("en-NG", {
  style: "currency",
  currency: "NGN",
  maximumFractionDigits: 0,
});

function getTodayInputDate(): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Lagos",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  const day = parts.find((part) => part.type === "day")?.value;

  return `${year}-${month}-${day}`;
}

function dateBounds(date: string) {
  const [yearText, monthText, dayText] = date.split("-");
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);

  const utcStart = new Date(Date.UTC(year, month - 1, day - 1, 23, 0, 0, 0));
  const utcEnd = new Date(Date.UTC(year, month - 1, day, 22, 59, 59, 999));

  return {
    dateFrom: utcStart.toISOString(),
    dateTo: utcEnd.toISOString(),
  };
}

function formatMinor(amountMinor: number) {
  return moneyFormatter.format(amountMinor / 100);
}

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString("en-NG", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function statusClass(status: RefundRequestItem["refund"]["status"]) {
  if (status === "SUCCESS") return "badge--paid";
  if (status === "FAILED") return "badge--danger";
  return "badge--pending";
}

function statusLabel(status: RefundRequestItem["refund"]["status"]) {
  if (status === "SUCCESS") return "Processed";
  if (status === "FAILED") return "Failed";
  return "Pending";
}

function shortId(id: string) {
  return id.slice(0, 8).toUpperCase();
}

function refundPaymentReference(item: RefundRequestItem) {
  return item.payment?.reference ?? item.refund.reference;
}

function RefundReviewModal({
  item,
  isProcessing,
  onClose,
  onProcess,
}: {
  item: RefundRequestItem;
  isProcessing: boolean;
  onClose: () => void;
  onProcess: (item: RefundRequestItem) => void;
}) {
  const paymentReference = refundPaymentReference(item);
  const canProcess = item.refund.status === "PENDING";

  return (
    <div className="modal-overlay" aria-hidden="true" onClick={onClose}>
      <div
        className="modal refund-review-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="refund-review-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="refund-review-modal__head">
          <div>
            <span className="modal-kicker">Refund review</span>
            <h2 id="refund-review-title">
              {item.order ? `Order #${shortId(item.order.id)}` : "Unlinked refund request"}
            </h2>
          </div>
          <button
            type="button"
            className="refund-review-modal__close"
            onClick={onClose}
            aria-label="Close refund review"
          >
            <X size={18} aria-hidden="true" />
          </button>
        </div>

        <div className="refund-review-modal__body">
          <section className="refund-review-summary" aria-label="Refund summary">
            <div>
              <span>Refund amount</span>
              <strong>{formatMinor(item.refund.amountMinor)}</strong>
            </div>
            <div>
              <span>Status</span>
              <strong className={`badge ${statusClass(item.refund.status)}`}>
                {statusLabel(item.refund.status)}
              </strong>
            </div>
          </section>

          <section className="refund-review-grid" aria-label="Refund details">
            <div>
              <span>Customer</span>
              <strong>{item.customer?.name ?? "Not available"}</strong>
            </div>
            <div>
              <span>Requested by</span>
              <strong>{item.requestedBy?.name ?? "Unknown"}</strong>
            </div>
            <div>
              <span>Payment reference</span>
              <code>{paymentReference}</code>
            </div>
            <div>
              <span>Payment status</span>
              <strong>{item.payment?.status ?? "Unknown"}</strong>
            </div>
            <div>
              <span>Provider</span>
              <strong>{item.refund.provider}</strong>
            </div>
            <div>
              <span>Requested at</span>
              <strong>{formatDateTime(item.refund.createdAt)}</strong>
            </div>
            {item.order && (
              <>
                <div>
                  <span>Order status</span>
                  <strong>{item.order.status.replaceAll("_", " ")}</strong>
                </div>
                <div>
                  <span>Order total</span>
                  <strong>{formatMinor(item.order.totalMinor)}</strong>
                </div>
              </>
            )}
          </section>

          <section className="refund-review-reason" aria-label="Refund reason">
            <span>Reason for refund request</span>
            <p>{item.refund.reason ?? "No reason was provided for this refund request."}</p>
          </section>

          <div className="refund-review-modal__actions">
            <Button tone="quiet" type="button" onClick={onClose} disabled={isProcessing}>
              Close
            </Button>
            <Button
              tone="navy"
              type="button"
              disabled={!canProcess || isProcessing}
              onClick={() => onProcess(item)}
            >
              {isProcessing ? "Processing..." : "Process refund"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function RefundsPage() {
  const today = getTodayInputDate();
  const [status, setStatus] = useState<"ALL" | "PENDING" | "SUCCESS" | "FAILED">("PENDING");
  const [reference, setReference] = useState("");
  const [submittedReference, setSubmittedReference] = useState("");
  const [selectedDate, setSelectedDate] = useState(today);
  const [offset, setOffset] = useState(0);
  const [reviewingRefund, setReviewingRefund] = useState<RefundRequestItem | null>(null);
  const selectedDateBounds = useMemo(() => dateBounds(selectedDate), [selectedDate]);
  const query = useMemo(
    () => ({
      limit: PAGE_SIZE,
      offset,
      ...selectedDateBounds,
      ...(status === "ALL" ? {} : { status }),
      ...(submittedReference.trim().length >= 2 ? { reference: submittedReference.trim() } : {}),
    }),
    [offset, selectedDateBounds, status, submittedReference],
  );
  const refunds = useRefundRequests(query);
  const processRefund = useProcessRefundRequest();
  const items = refunds.data?.refundRequests ?? [];
  const pendingCount = items.filter((item) => item.refund.status === "PENDING").length;
  const settledCount = items.filter((item) => item.refund.status === "SUCCESS").length;

  function applySearch() {
    setOffset(0);
    setSubmittedReference(reference.trim());
  }

  function handleReferenceChange(value: string) {
    setReference(value);

    if (value.trim() === "" && submittedReference !== "") {
      setOffset(0);
      setSubmittedReference("");
    }
  }

  function processRequest(item: RefundRequestItem) {
    processRefund.mutate(
      {
        reference: refundPaymentReference(item),
        amountMinor: item.refund.amountMinor,
        reason: item.refund.reason ?? `Admin processed refund ${item.refund.reference}`,
      },
      {
        onSuccess: () => setReviewingRefund(null),
      },
    );
  }

  return (
    <div className="refunds-page">
      {reviewingRefund && (
        <RefundReviewModal
          item={reviewingRefund}
          isProcessing={processRefund.isPending}
          onClose={() => {
            if (!processRefund.isPending) setReviewingRefund(null);
          }}
          onProcess={processRequest}
        />
      )}

      <section className="refund-panel">
        <div className="refund-command-bar" aria-label="Refund request controls">
          <div className="refund-command-bar__header">
            <div className="refund-command-bar__title">
              <span className="refund-command-bar__icon" aria-hidden="true">
                <ClipboardList size={22} />
              </span>
              <div>
                <span className="refund-command-bar__label">Refund Request Ledger</span>
                <p>Track and manage all refund requests</p>
              </div>
            </div>

            <div className="refund-command-bar__stats" aria-label="Refund summary">
              <article className="refund-stat-card refund-stat-card--settled">
                <span>
                  <CheckCircle2 aria-hidden="true" size={17} /> {""}
                  Settled
                </span>
                <strong>{settledCount}</strong>
              </article>
              <article className="refund-stat-card refund-stat-card--pending">
                <span>
                  {" "}
                  <Banknote aria-hidden="true" size={17} />
                  Pending
                </span>
                <strong>{pendingCount}</strong>
              </article>
            </div>
          </div>

          <div className="refund-toolbar__controls">
            <label className="refund-date-filter">
              <input
                type="date"
                value={selectedDate}
                max={today}
                onChange={(event) => {
                  setSelectedDate(event.target.value);
                  setOffset(0);
                }}
              />
            </label>
            <select
              value={status}
              onChange={(event) => {
                setStatus(event.target.value as typeof status);
                setOffset(0);
              }}
              aria-label="Filter refund requests by status"
            >
              <option value="PENDING">Pending</option>
              <option value="SUCCESS">Processed</option>
              <option value="FAILED">Failed</option>
              <option value="ALL">All refunds</option>
            </select>
            <label className="refund-search">
              <Search aria-hidden="true" size={16} />
              <input
                value={reference}
                placeholder="Search reference"
                onChange={(event) => handleReferenceChange(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") applySearch();
                }}
              />
            </label>
            <Button
              tone="navy"
              type="button"
              className="admin-compact-action"
              onClick={applySearch}
            >
              <Search aria-hidden="true" size={14} />
              Search
            </Button>
          </div>
        </div>

        {refunds.isPending ? (
          <div className="refund-table-panel">
            <div className="table-wrap">
              <table className="refund-table">
                <thead>
                  <tr>
                    <th>Request</th>
                    <th>Amount</th>
                    <th>Date &amp; Time</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {Array.from({ length: 5 }).map((_, rowIndex) => (
                    <tr key={rowIndex}>
                      {Array.from({ length: TABLE_COLUMNS }).map((__, cellIndex) => (
                        <td key={cellIndex}>
                          <Skeleton variant="text" sx={{ fontSize: "1rem" }} />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : refunds.isError ? (
          <div className="refund-empty">
            <span className="refund-empty__illustration" aria-hidden="true">
              <ClipboardList size={66} />
            </span>
            <strong>Refund requests are unavailable</strong>
            <p>Please refresh the page or try again shortly.</p>
            <Button tone="quiet" type="button" onClick={() => void refunds.refetch()}>
              <RefreshCw aria-hidden="true" size={16} />
              Refresh page
            </Button>
          </div>
        ) : items.length === 0 ? (
          <div className="refund-empty">
            <span className="refund-empty__illustration" aria-hidden="true">
              <ClipboardList size={66} />
            </span>
            <strong>No refund requests found</strong>
            <p>Try another status or reference search.</p>
          </div>
        ) : (
          <div className="refund-table-panel">
            <div className="table-wrap">
              <table className="refund-table">
                <thead>
                  <tr>
                    <th>Request</th>
                    <th>Amount</th>
                    <th>Date &amp; Time</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => (
                    <tr key={item.refund.id}>
                      <td>
                        <span className="refund-request-cell">
                          <strong>
                            {item.order
                              ? `#${shortId(item.order.id)}`
                              : `#${shortId(item.refund.id)}`}
                          </strong>
                          <small>{item.customer?.name ?? "Customer not available"}</small>
                        </span>
                      </td>
                      <td className="refund-table-amount">
                        {formatMinor(item.refund.amountMinor)}
                      </td>
                      <td className="order-date-time">{formatDateTime(item.refund.createdAt)}</td>
                      <td>
                        <span className={`badge ${statusClass(item.refund.status)}`}>
                          {statusLabel(item.refund.status)}
                        </span>
                      </td>
                      <td>
                        <Button
                          tone="quiet"
                          type="button"
                          className="refund-review-action"
                          onClick={() => setReviewingRefund(item)}
                        >
                          <Eye aria-hidden="true" size={15} />
                          Review
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {refunds.data && (
          <div className="orders-pagination refunds-pagination">
            <button
              className="orders-pagination__button"
              type="button"
              disabled={!refunds.data.hasPrevious}
              onClick={() => setOffset(refunds.data?.previous ?? 0)}
            >
              <ArrowLeft size={16} />
            </button>
            <span>
              Showing {refunds.data.total === 0 ? 0 : refunds.data.offset + 1}-
              {Math.min(refunds.data.offset + refunds.data.limit, refunds.data.total)} of{" "}
              {refunds.data.total} refunds
            </span>
            <button
              className="orders-pagination__button"
              type="button"
              disabled={!refunds.data.hasNext}
              onClick={() => setOffset(refunds.data?.next ?? offset)}
            >
              <ArrowRight size={16} />
            </button>
          </div>
        )}
      </section>
    </div>
  );
}
