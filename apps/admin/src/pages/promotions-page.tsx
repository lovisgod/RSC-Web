import { Button } from "@rsc/ui";
import { useState } from "react";

import { useSendPromo } from "../hooks/use-send-promo";

const EMPTY_FORM = {
  type: "SPECIAL_PERIOD",
  title: "",
  body: "",
  recipientRole: "CUSTOMER",
  promoCode: "",
};

export function PromotionsPage() {
  const [form, setForm] = useState(EMPTY_FORM);
  const { mutate: sendPromo, isPending } = useSendPromo();

  function field(key: keyof typeof EMPTY_FORM) {
    return {
      value: form[key],
      onChange: (
        e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
      ) => setForm((prev) => ({ ...prev, [key]: e.target.value })),
    };
  }

  function handleBroadcast() {
    if (!form.title.trim() || !form.body.trim() || !form.promoCode.trim()) return;
    sendPromo(
      {
        type: form.type,
        title: form.title.trim(),
        body: form.body.trim(),
        recipientRole: form.recipientRole,
        promoCode: form.promoCode.trim(),
      },
      { onSuccess: () => setForm(EMPTY_FORM) },
    );
  }

  const canBroadcast = form.title.trim() && form.body.trim() && form.promoCode.trim();

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
