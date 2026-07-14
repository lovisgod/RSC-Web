import { Button } from "@rsc/ui";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";

import { useSendPromo } from "../hooks/use-send-promo";
import { listOutlets } from "../lib/api";

const EMPTY_FORM = {
  type: "SPECIAL_PERIOD",
  title: "",
  body: "",
  recipientRole: "CUSTOMER",
  promoCode: "",
  discountTarget: "DELIVERY",
  discountPercent: "100",
  scope: "ALL_OUTLETS",
  outletId: "",
  startsAt: "",
  endsAt: "",
};

export function PromotionsPage() {
  const [form, setForm] = useState(EMPTY_FORM);
  const { mutate: sendPromo, isPending } = useSendPromo();
  const { data: outlets = [] } = useQuery({ queryKey: ["outlets"], queryFn: listOutlets });

  function field(key: keyof typeof EMPTY_FORM) {
    return {
      value: form[key],
      onChange: (
        e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
      ) => setForm((prev) => ({ ...prev, [key]: e.target.value })),
    };
  }

  function handleBroadcast() {
    if (
      !form.title.trim() ||
      !form.body.trim() ||
      !form.promoCode.trim() ||
      !form.startsAt ||
      !form.endsAt ||
      (form.scope === "OUTLET" && !form.outletId)
    ) {
      return;
    }
    sendPromo(
      {
        type: form.type,
        title: form.title.trim(),
        body: form.body.trim(),
        recipientRole: form.recipientRole as "CUSTOMER" | "ADMIN" | "RIDER",
        promoCode: form.promoCode.trim(),
        discountTarget: form.discountTarget as "DELIVERY" | "ORDER",
        discountPercent: Number(form.discountPercent),
        scope: form.scope as "ALL_OUTLETS" | "OUTLET",
        ...(form.scope === "OUTLET" ? { outletId: form.outletId } : {}),
        startsAt: new Date(form.startsAt).toISOString(),
        endsAt: new Date(form.endsAt).toISOString(),
      },
      { onSuccess: () => setForm(EMPTY_FORM) },
    );
  }

  const canBroadcast =
    form.title.trim() &&
    form.body.trim() &&
    form.promoCode.trim() &&
    form.startsAt &&
    form.endsAt &&
    (form.scope !== "OUTLET" || form.outletId);

  return (
    <div className="promo-wrap">
      <div className="panel promo-panel">
        <h2 className="promo-panel__title">Compose Platform Promotion Push Campaign</h2>

        <div className="promo-form">
          <label className="field-label">
            Campaign Type
            <select className="field-input" {...field("type")}>
              <option value="SPECIAL_PERIOD">Special Period</option>
            </select>
          </label>

          <label className="field-label">
            Campaign Title
            <input
              className="field-input"
              type="text"
              placeholder="e.g. Happy Friday!"
              {...field("title")}
            />
          </label>

          <label className="field-label">
            Push Message Body
            <textarea
              className="field-input field-input--textarea"
              placeholder="Get 20% off all grills at Cactus. Order now!"
              {...field("body")}
            />
          </label>

          <div className="modal-row">
            <label className="field-label">
              Recipient Role
              <select className="field-input" {...field("recipientRole")}>
                <option value="CUSTOMER">Customers</option>
              </select>
            </label>

            <label className="field-label">
              Promo Code
              <input
                className="field-input"
                type="text"
                placeholder="e.g. WEEKEND"
                {...field("promoCode")}
              />
            </label>
          </div>

          <div className="modal-row">
            <label className="field-label">
              Discount Applies To
              <select className="field-input" {...field("discountTarget")}>
                <option value="DELIVERY">Delivery fee</option>
                <option value="ORDER">Order subtotal</option>
              </select>
            </label>

            <label className="field-label">
              Discount %
              <input
                className="field-input"
                type="number"
                min={1}
                max={100}
                {...field("discountPercent")}
              />
            </label>
          </div>

          <div className="modal-row">
            <label className="field-label">
              Promo Scope
              <select className="field-input" {...field("scope")}>
                <option value="ALL_OUTLETS">All outlets</option>
                <option value="OUTLET">Specific outlet</option>
              </select>
            </label>

            {form.scope === "OUTLET" && (
              <label className="field-label">
                Outlet
                <select className="field-input" {...field("outletId")}>
                  <option value="">Select outlet</option>
                  {outlets.map((outlet) => (
                    <option key={outlet.id} value={outlet.id}>
                      {outlet.name}
                    </option>
                  ))}
                </select>
              </label>
            )}
          </div>

          <div className="modal-row">
            <label className="field-label">
              Starts
              <input className="field-input" type="datetime-local" {...field("startsAt")} />
            </label>

            <label className="field-label">
              Ends
              <input className="field-input" type="datetime-local" {...field("endsAt")} />
            </label>
          </div>

          <div className="promo-actions">
            <Button tone="quiet" disabled={isPending} onClick={() => setForm(EMPTY_FORM)}>
              Clear Form
            </Button>
            <Button tone="navy" disabled={isPending || !canBroadcast} onClick={handleBroadcast}>
              {isPending ? "Broadcasting…" : "Broadcast Campaign"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
