import Skeleton from "@mui/material/Skeleton";
import { Button } from "@rsc/ui";
import type { RefundRequestItem } from "@rsc/contracts";
import {
  ArrowLeft,
  ArrowRight,
  Banknote,
  CheckCircle2,
  ClipboardList,
  RefreshCw,
  Search,
} from "lucide-react";
import { useMemo, useState } from "react";

import { useProcessRefundRequest, useRefundRequests } from "../hooks/use-refund-requests";

const PAGE_SIZE = 20;

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

function shortId(id: string) {
  return id.slice(0, 8).toUpperCase();
}

export function RefundsPage() {
  const today = getTodayInputDate();
  const [status, setStatus] = useState<"ALL" | "PENDING" | "SUCCESS" | "FAILED">("PENDING");
  const [reference, setReference] = useState("");
  const [submittedReference, setSubmittedReference] = useState("");
  const [selectedDate, setSelectedDate] = useState(today);
  const [offset, setOffset] = useState(0);
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
    setSubmittedReference(reference);
  }

  function processRequest(item: RefundRequestItem) {
    const paymentReference = item.payment?.reference ?? item.refund.reference;
    const label = item.order
      ? `order #${shortId(item.order.id)}`
      : `refund ${item.refund.reference}`;
    if (!window.confirm(`Process ${formatMinor(item.refund.amountMinor)} refund for ${label}?`)) {
      return;
    }

    processRefund.mutate({
      reference: paymentReference,
      amountMinor: item.refund.amountMinor,
      reason: item.refund.reason ?? `Admin processed refund ${item.refund.reference}`,
    });
  }

  return (
    <div className="refunds-page">
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
                onChange={(event) => setReference(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") applySearch();
                }}
              />
            </label>
            <Button tone="navy" type="button" onClick={applySearch}>
              <Search aria-hidden="true" size={17} />
              Search
            </Button>
          </div>
        </div>

        {refunds.isPending ? (
          <div className="refund-list">
            {Array.from({ length: 4 }).map((_, index) => (
              <Skeleton key={index} variant="rectangular" height={126} sx={{ borderRadius: 24 }} />
            ))}
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
          <div className="refund-list">
            {items.map((item) => (
              <article className="refund-card" key={item.refund.id}>
                <div className="refund-card__main">
                  <div>
                    <span className={`badge ${statusClass(item.refund.status)}`}>
                      {item.refund.status === "SUCCESS"
                        ? "Processed"
                        : item.refund.status === "FAILED"
                          ? "Failed"
                          : "Pending"}
                    </span>
                    <h3>
                      {item.order ? `Order #${shortId(item.order.id)}` : "Unlinked order context"}
                    </h3>
                    <p>
                      Customer: <strong>{item.customer?.name ?? "Not available"}</strong>
                    </p>
                    <p>
                      Payment ref: <code>{item.payment?.reference ?? item.refund.reference}</code>
                    </p>
                  </div>
                  <div className="refund-card__amount">
                    <strong>{formatMinor(item.refund.amountMinor)}</strong>
                    <span>{formatDateTime(item.refund.createdAt)}</span>
                  </div>
                </div>

                <div className="refund-card__meta">
                  <span>Requested by {item.requestedBy?.name ?? "Unknown"}</span>
                  <span>Provider: {item.refund.provider}</span>
                  <span>Payment: {item.payment?.status ?? "Unknown"}</span>
                  {item.refund.reason && (
                    <span className="refund-card__reason">{item.refund.reason}</span>
                  )}
                </div>

                <div className="refund-card__actions">
                  <Button
                    tone="navy"
                    type="button"
                    disabled={item.refund.status !== "PENDING" || processRefund.isPending}
                    onClick={() => processRequest(item)}
                  >
                    {processRefund.isPending ? "Processing..." : "Process refund"}
                  </Button>
                </div>
              </article>
            ))}
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
