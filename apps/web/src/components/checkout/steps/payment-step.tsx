"use client";

import { Button } from "@rsc/ui";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";

import { cartSubtotalMinor, formatNaira } from "@/src/lib/data/cart";
import { VAT_RATE, type DeliveryForm } from "@/src/lib/data/checkout";
import { useCart } from "@/src/hooks/use-cart";
import { inputClass } from "@/src/lib/form-styles";
import { PaymentProcessingModal } from "@/src/components/checkout/payment-processing-modal";

type PaymentTab = "card" | "transfer" | "ussd";

const TABS: { id: PaymentTab; icon: string; label: string }[] = [
  { id: "card", icon: "💳", label: "Card" },
  { id: "transfer", icon: "🏦", label: "Transfer" },
  { id: "ussd", icon: "📱", label: "USSD" },
];

// ── TanStack queries ──────────────────────────────────────

function useTransferDetails() {
  return useQuery({
    queryKey: ["payment", "transfer-details"],
    queryFn: async () => {
      // TODO: replace with apiClient.getTransferDetails()
      await new Promise((r) => setTimeout(r, 500));
      return {
        bankName: "PROVideus BANK ACCOUNT (MOMENT)",
        accountNumber: "9021482012",
        instruction: "Transfer exactly the amount above. Click verification below.",
      };
    },
    staleTime: 5 * 60 * 1000,
  });
}

function useUssdBanks() {
  return useQuery({
    queryKey: ["payment", "ussd-banks"],
    queryFn: async () => {
      // TODO: replace with apiClient.getUssdBanks()
      await new Promise((r) => setTimeout(r, 400));
      return [
        { name: "GTBank (*737#)", code: "*737#" },
        { name: "Access Bank (*901#)", code: "*901#" },
        { name: "First Bank (*894#)", code: "*894#" },
        { name: "UBA (*919#)", code: "*919#" },
        { name: "Zenith Bank (*966#)", code: "*966#" },
        { name: "Sterling Bank (*822#)", code: "*822#" },
      ];
    },
    staleTime: 10 * 60 * 1000,
  });
}

// ── Tab panels ────────────────────────────────────────────

function CardPanel({ onPay }: { onPay: () => void }) {
  const [number, setNumber] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cvv, setCvv] = useState("");

  function formatCardNumber(v: string) {
    return v
      .replace(/\D/g, "")
      .slice(0, 16)
      .replace(/(.{4})/g, "$1 ")
      .trim();
  }

  function formatExpiry(v: string) {
    const digits = v.replace(/\D/g, "").slice(0, 4);
    return digits.length > 2 ? `${digits.slice(0, 2)}/${digits.slice(2)}` : digits;
  }

  return (
    <div className="space-y-3">
      <input
        value={number}
        onChange={(e) => setNumber(formatCardNumber(e.target.value))}
        placeholder="Card number"
        inputMode="numeric"
        className={inputClass}
      />
      <div className="grid grid-cols-2 gap-3">
        <input
          value={expiry}
          onChange={(e) => setExpiry(formatExpiry(e.target.value))}
          placeholder="MM/YY"
          inputMode="numeric"
          className={inputClass}
        />
        <input
          value={cvv}
          onChange={(e) => setCvv(e.target.value.replace(/\D/g, "").slice(0, 4))}
          placeholder="CVV"
          type="password"
          inputMode="numeric"
          className={inputClass}
        />
      </div>
      <Button tone="navy" fullWidth type="button" onClick={onPay}>
        Pay Securely with Moment
      </Button>
    </div>
  );
}

function TransferPanel({ onConfirm }: { onConfirm: () => void }) {
  const { data, isPending } = useTransferDetails();

  return (
    <div className="space-y-4">
      {isPending ? (
        <div className="animate-pulse space-y-2 p-4 border border-gray-100 rounded-xl">
          <div className="h-3 w-48 bg-gray-200 rounded" />
          <div className="h-8 w-32 bg-gray-200 rounded" />
          <div className="h-3 w-56 bg-gray-100 rounded" />
        </div>
      ) : data ? (
        <div className="p-4 border border-gray-200 rounded-xl space-y-2">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
            {data.bankName}
          </p>
          <p className="text-3xl font-bold" style={{ color: "var(--rsc-main)" }}>
            {data.accountNumber}
          </p>
          <p className="text-sm text-gray-500">{data.instruction}</p>
        </div>
      ) : null}

      <Button tone="navy" fullWidth type="button" onClick={onConfirm}>
        I&apos;ve Sent the Money
      </Button>
    </div>
  );
}

function UssdPanel({ onConfirm }: { onConfirm: () => void }) {
  const { data: banks, isPending } = useUssdBanks();
  const [selected, setSelected] = useState("");

  return (
    <div className="space-y-4">
      {isPending ? (
        <div className="h-14 bg-gray-100 rounded-xl animate-pulse" />
      ) : (
        <select
          value={selected}
          onChange={(e) => setSelected(e.target.value)}
          className={inputClass}
        >
          <option value="">Select your bank</option>
          {banks?.map((b) => (
            <option key={b.code} value={b.code}>
              {b.name}
            </option>
          ))}
        </select>
      )}

      <Button tone="navy" fullWidth type="button" onClick={onConfirm}>
        Dial Code &amp; Verify
      </Button>
    </div>
  );
}

// ── Main component ────────────────────────────────────────

export function PaymentStep({
  deliveryForm,
  onBack,
  onSuccess,
}: {
  deliveryForm: DeliveryForm;
  onBack: () => void;
  onSuccess: (orderId: string) => void;
}) {
  const { data: cart } = useCart();
  const [tab, setTab] = useState<PaymentTab>("card");
  const [processing, setProcessing] = useState(false);

  const subtotal = cart ? cartSubtotalMinor(cart) : 0;
  const fee = deliveryForm.mode === "delivery" && cart ? cart.deliveryFeeMinor : 0;
  const vat = Math.round((subtotal + fee) * VAT_RATE);
  const total = subtotal + fee + vat;

  return (
    <>
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {/* Moment header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <span className="text-xl">⚡</span>
            <span className="text-lg font-bold" style={{ color: "var(--rsc-main)" }}>
              Moment
            </span>
            <span
              className="text-xs font-bold px-2 py-0.5 rounded text-white"
              style={{ backgroundColor: "var(--rsc-dark)" }}
            >
              Checkout
            </span>
          </div>
          <span className="text-xl font-bold text-gray-900">{formatNaira(total)}</span>
        </div>

        <div className="p-5 space-y-5">
          {/* Method tabs */}
          <div className="flex bg-gray-100 rounded-2xl p-1 gap-1">
            {TABS.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                  tab === t.id
                    ? "bg-white shadow-sm text-gray-900"
                    : "text-gray-400 hover:text-gray-600"
                }`}
              >
                <span>{t.icon}</span>
                <span>{t.label}</span>
              </button>
            ))}
          </div>

          {/* Panel */}
          {tab === "card" && <CardPanel onPay={() => setProcessing(true)} />}
          {tab === "transfer" && <TransferPanel onConfirm={() => setProcessing(true)} />}
          {tab === "ussd" && <UssdPanel onConfirm={() => setProcessing(true)} />}

          {/* Cancel */}
          <div className="text-center">
            <button
              type="button"
              onClick={onBack}
              className="text-sm text-gray-400 hover:text-gray-600 transition-colors"
            >
              Cancel Transaction
            </button>
          </div>
        </div>
      </div>

      {processing && (
        <PaymentProcessingModal
          onSuccess={() => {
            setProcessing(false);
            onSuccess("RSC-482916");
          }}
          onFailed={() => setProcessing(false)}
        />
      )}
    </>
  );
}
