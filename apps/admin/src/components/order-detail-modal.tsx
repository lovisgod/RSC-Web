import { Button } from "@rsc/ui";
import type { OutletSummary } from "@rsc/contracts";
import { Check, Copy, X } from "lucide-react";
import { useState } from "react";
import { createPortal } from "react-dom";

import type { AdminOrderItem } from "../lib/api";

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <button
      type="button"
      className={`copy-btn${copied ? " copy-btn--copied" : ""}`}
      aria-label="Copy to clipboard"
      onClick={handleCopy}
    >
      {copied ? <Check size={13} /> : <Copy size={13} />}
    </button>
  );
}

interface Props {
  item: AdminOrderItem;
  outletById: Record<string, OutletSummary>;
  onClose: () => void;
}

const fmt = (minor: number) => `₦${(minor / 100).toLocaleString("en-NG")}`;

const STATUS_LABELS: Record<string, string> = {
  PENDING_PAYMENT: "Awaiting Payment",
  CONFIRMED: "Confirmed",
  PARTIALLY_READY: "Part Ready",
  READY: "Ready",
  OUT_FOR_DELIVERY: "On Delivery",
  DELIVERED: "Delivered",
  CANCELLED: "Cancelled",
};

const STATUS_COLORS: Record<string, string> = {
  DELIVERED: "#16a34a",
  CANCELLED: "#dc2626",
  PENDING_PAYMENT: "#d97706",
  CONFIRMED: "#2563eb",
  READY: "#059669",
  OUT_FOR_DELIVERY: "#7c3aed",
  PARTIALLY_READY: "#ca8a04",
};

export function OrderDetailModal({ item, outletById, onClose }: Props) {
  const { order, subOrders, lineItems } = item;

  // Group line items by their sub-order
  const linesBySubOrder: Record<string, typeof lineItems> = {};
  for (const li of lineItems) {
    (linesBySubOrder[li.subOrderId] ??= []).push(li);
  }

  const statusColor = STATUS_COLORS[order.status] ?? "var(--rsc-text-muted)";
  const statusText = STATUS_LABELS[order.status] ?? order.status;

  return createPortal(
    <div className="modal-overlay" aria-hidden="true" onClick={onClose}>
      <div
        className="modal modal--order"
        role="dialog"
        aria-modal="true"
        aria-labelledby="order-modal-title"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Header ───────────────────────────────────────── */}
        <div className="modal__head">
          <div style={{ flex: 1 }}>
            <p className="kicker" style={{ margin: 0 }}>
              Platform Order
            </p>
            <h2 id="order-modal-title" style={{ margin: "0.15rem 0 0" }}>
              Order #{order.id.slice(0, 8).toUpperCase()}
            </h2>
          </div>

          <span
            className="order-modal__status-badge"
            style={{
              background: `${statusColor}18`,
              color: statusColor,
              borderColor: `${statusColor}40`,
            }}
          >
            {statusText}
          </span>

          <button type="button" className="modal__close" aria-label="Close" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {/* ── Body ─────────────────────────────────────────── */}
        <div className="modal__body order-modal__body">
          {/* Meta row */}
          <div className="order-modal__meta">
            <div className="order-modal__meta-item">
              <span className="order-modal__meta-label">Mode</span>
              <span className="order-modal__meta-value">{order.deliveryMode}</span>
            </div>
            <div className="order-modal__meta-item">
              <span className="order-modal__meta-label">Address</span>
              <span className="order-modal__meta-value">
                {order.deliveryAddress ?? (
                  <em style={{ color: "var(--rsc-text-muted)" }}>Takeout — No delivery address</em>
                )}
              </span>
            </div>
            <div className="order-modal__meta-item">
              <span className="order-modal__meta-label">Payment Ref</span>
              <span
                className="order-modal__meta-value text-mono copy-row"
                style={{ fontSize: "0.8rem" }}
              >
                {order.paymentReference ? (
                  <>
                    {order.paymentReference}
                    <CopyButton text={order.paymentReference} />
                  </>
                ) : (
                  <em style={{ color: "var(--rsc-text-muted)" }}>Not available</em>
                )}
              </span>
            </div>
          </div>

          {/* Ledger heading */}
          <div className="order-modal__section-title">Instant Split Payment Ledger Summary</div>

          {/* Per-outlet sub-order cards */}
          {subOrders.map((sub) => {
            const outlet = outletById[sub.outletId];
            const lines = linesBySubOrder[sub.id] ?? [];
            const commPct =
              sub.subtotalMinor > 0
                ? Math.round((sub.commissionMinor / sub.subtotalMinor) * 100)
                : 0;
            const payoutPct = 100 - commPct;

            return (
              <div key={sub.id} className="order-modal__sub-card">
                {/* Sub-order header */}
                <div className="order-modal__sub-head">
                  <span className="order-modal__sub-name">
                    🔥 {outlet?.name ?? "Outlet"} Sub-Order
                  </span>
                  <span className="order-modal__sub-subtotal">
                    Subtotal: {fmt(sub.subtotalMinor)}
                  </span>
                </div>

                {/* Line items */}
                {lines.length > 0 && (
                  <div className="order-modal__lines">
                    {lines.map((li) => (
                      <div key={li.id} className="order-modal__line">
                        <div className="order-modal__line-info">
                          <span className="order-modal__line-name">
                            {li.quantity}× {li.itemNameSnapshot}
                          </span>
                          {li.modifiersSnapshot && li.modifiersSnapshot.length > 0 && (
                            <span className="order-modal__line-mods">
                              {(li.modifiersSnapshot as Array<{ name: string }>)
                                .map((m) => m.name)
                                .join(" · ")}
                            </span>
                          )}
                        </div>
                        <span className="order-modal__line-price">{fmt(li.lineTotalMinor)}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Financial breakdown */}
                <div className="order-modal__sub-finance">
                  <div className="order-modal__finance-row">
                    <span className="order-modal__finance-label">
                      Moment Account: <code>{outlet?.momentSubaccountCode ?? "—"}</code>
                    </span>
                    <span className="order-modal__finance-payout">
                      Payout ({payoutPct}%): {fmt(sub.netMinor)}
                    </span>
                  </div>
                  <div className="order-modal__finance-row">
                    <span className="order-modal__finance-label">
                      Platform Fee: <code>RSC_MAIN_WALLET</code>
                    </span>
                    <span className="order-modal__finance-commission">
                      Commission ({commPct}%): {fmt(sub.commissionMinor)}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}

          {/* Platform surpluses */}
          {(order.vatMinor > 0 || order.deliveryFeeMinor > 0) && (
            <div className="order-modal__surplus-card">
              <div className="order-modal__surplus-head">
                <span>RSC Platform Surpluses</span>
                <span>VAT + Delivery</span>
              </div>
              {order.vatMinor > 0 && (
                <div className="order-modal__surplus-row">
                  <span>Value Added Tax (7.5%):</span>
                  <span>{fmt(order.vatMinor)}</span>
                </div>
              )}
              {order.deliveryFeeMinor > 0 && (
                <div className="order-modal__surplus-row">
                  <span>Delivery Logistics Flat:</span>
                  <span>{fmt(order.deliveryFeeMinor)}</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Grand Total — pinned above footer ────────────── */}
        <div className="order-modal__total">
          <span>Grand Total</span>
          <strong>{fmt(order.totalMinor)}</strong>
        </div>

        {/* ── Footer ───────────────────────────────────────── */}
        <div className="order-modal__footer">
          <Button tone="quiet" onClick={onClose}>
            Close Panel
          </Button>
          <Button tone="danger">Process Refund 💸</Button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
