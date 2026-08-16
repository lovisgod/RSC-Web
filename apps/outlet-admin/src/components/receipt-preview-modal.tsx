import { Loader2, Printer, X } from "lucide-react";

import type { ReceiptPrintInput } from "../lib/native-bridge";
import { formatReceiptMoney } from "../lib/receipt";

interface ReceiptPreviewModalProps {
  receipt: ReceiptPrintInput;
  isPrinting: boolean;
  onClose: () => void;
  onPrint: () => void;
}

export function ReceiptPreviewModal({
  receipt,
  isPrinting,
  onClose,
  onPrint,
}: ReceiptPreviewModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 px-4 py-6 backdrop-blur-sm">
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="receipt-preview-title"
        className="flex max-h-[92dvh] w-full max-w-md flex-col overflow-hidden rounded-3xl bg-white shadow-2xl"
      >
        <header className="flex items-start justify-between gap-4 border-b border-slate-100 px-5 py-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-orange-500">
              Receipt preview
            </p>
            <h2 id="receipt-preview-title" className="mt-1 text-xl font-black text-slate-900">
              {receipt.title}
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              Review this ticket before sending it to the connected printer.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isPrinting}
            aria-label="Close receipt preview"
            className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-slate-200 text-slate-400 transition hover:bg-slate-50 hover:text-slate-700 disabled:opacity-50"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto bg-slate-50 px-5 py-4">
          <div className="mx-auto max-w-sm rounded-2xl border border-slate-200 bg-white p-4 font-mono text-sm text-slate-900 shadow-sm">
            <div className="text-center">
              <p className="text-base font-black">{receipt.outletName ?? "DineOut NG Outlet"}</p>
              <p className="mt-1 text-xs uppercase tracking-[0.18em] text-slate-500">
                {receipt.deliveryMode === "DELIVERY" ? "Delivery ticket" : "Takeout ticket"}
              </p>
            </div>

            <div className="my-4 border-t border-dashed border-slate-300" />

            <dl className="space-y-1 text-xs">
              <div className="flex justify-between gap-3">
                <dt className="text-slate-500">Sub-order</dt>
                <dd className="font-bold">#{receipt.orderId.slice(-8).toUpperCase()}</dd>
              </div>
              {receipt.masterOrderId && (
                <div className="flex justify-between gap-3">
                  <dt className="text-slate-500">Master</dt>
                  <dd className="font-bold">#{receipt.masterOrderId.slice(-8).toUpperCase()}</dd>
                </div>
              )}
              <div className="flex justify-between gap-3">
                <dt className="text-slate-500">Printed</dt>
                <dd className="font-bold">
                  {new Date(receipt.printedAt).toLocaleString("en-NG", {
                    dateStyle: "medium",
                    timeStyle: "short",
                  })}
                </dd>
              </div>
            </dl>

            <div className="my-4 border-t border-dashed border-slate-300" />

            <ul className="space-y-3">
              {receipt.items.map((item, index) => (
                <li key={`${item.name}-${index}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-bold">{item.name}</p>
                      <p className="text-xs text-slate-500">
                        {formatReceiptMoney(item.unitPriceMinor)} × {item.quantity}
                      </p>
                    </div>
                    <p className="font-bold">
                      {formatReceiptMoney(item.unitPriceMinor * item.quantity)}
                    </p>
                  </div>
                  {item.modifiers?.length ? (
                    <ul className="mt-1 space-y-1 pl-4 text-xs text-slate-500">
                      {item.modifiers.map((modifier, modifierIndex) => (
                        <li
                          key={`${modifier.name}-${modifierIndex}`}
                          className="flex items-start justify-between gap-3"
                        >
                          <span>+ {modifier.name}</span>
                          {modifier.amountMinor ? (
                            <span className="shrink-0">
                              {formatReceiptMoney(modifier.amountMinor)} × {item.quantity}
                            </span>
                          ) : null}
                        </li>
                      ))}
                    </ul>
                  ) : null}
                  {item.customerNote && (
                    <p className="mt-1 rounded-lg bg-slate-50 px-2 py-1 text-xs italic text-slate-600">
                      Note: {item.customerNote}
                    </p>
                  )}
                </li>
              ))}
            </ul>

            <div className="my-4 border-t border-dashed border-slate-300" />

            <div className="space-y-1 text-sm">
              <div className="flex justify-between text-base">
                <span className="font-black">Total</span>
                <strong>{formatReceiptMoney(receipt.totals.totalMinor)}</strong>
              </div>
            </div>

            {receipt.footer && (
              <p className="mt-5 text-center text-xs font-semibold text-slate-500">
                {receipt.footer}
              </p>
            )}
          </div>
        </div>

        <footer className="flex flex-col gap-2 border-t border-slate-100 bg-white px-5 py-4 sm:flex-row">
          <button
            type="button"
            onClick={onClose}
            disabled={isPrinting}
            className="rounded-full border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-600 transition hover:bg-slate-50 disabled:opacity-50 sm:flex-1"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onPrint}
            disabled={isPrinting}
            className="inline-flex items-center justify-center gap-2 rounded-full bg-[var(--rsc-main)] px-4 py-2.5 text-sm font-bold text-white transition hover:brightness-105 disabled:cursor-wait disabled:opacity-60 sm:flex-1"
          >
            {isPrinting ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <Printer className="h-4 w-4" aria-hidden="true" />
            )}
            {isPrinting ? "Printing..." : "Print receipt"}
          </button>
        </footer>
      </section>
    </div>
  );
}
