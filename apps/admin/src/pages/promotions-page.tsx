import { Button } from "@rsc/ui";
import { useMutation } from "@tanstack/react-query";
import { useState } from "react";

import { useSendPromo } from "../hooks/use-send-promo";
import { scheduleNotificationCampaign } from "../lib/api";
import { toastBus } from "../lib/toast-bus";

const EMPTY_FORM = {
  notificationType: "PROMOS",
  title: "",
  body: "",
  recipientRole: "CUSTOMER",
  promoCode: "",
  scheduledAt: "",
};

export function PromotionsPage() {
  const [form, setForm] = useState(EMPTY_FORM);
  const { mutate: sendPromo, isPending } = useSendPromo();
  const scheduleCampaign = useMutation({
    mutationFn: scheduleNotificationCampaign,
    onSuccess: () => {
      toastBus.emit("Campaign scheduled successfully", "success");
      setForm(EMPTY_FORM);
    },
    onError: (err: Error) => toastBus.emit(err.message, "error"),
  });

  const isCampaign = form.notificationType === "CAMPAIGN";
  const isSubmitting = isPending || scheduleCampaign.isPending;

  function field(key: keyof typeof EMPTY_FORM) {
    return {
      value: form[key],
      onChange: (
        event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
      ) => setForm((previous) => ({ ...previous, [key]: event.target.value })),
    };
  }

  function handleBroadcast() {
    if (!form.title.trim() || !form.body.trim()) return;

    if (isCampaign) {
      if (!form.scheduledAt) return;

      scheduleCampaign.mutate({
        title: form.title.trim(),
        body: form.body.trim(),
        targetSegment: "ALL_CUSTOMERS",
        scheduledAt: new Date(form.scheduledAt).toISOString(),
      });
      return;
    }

    if (!form.promoCode.trim()) return;

    sendPromo(
      {
        type: "PROMO",
        title: form.title.trim(),
        body: form.body.trim(),
        recipientRole: form.recipientRole,
        promoCode: form.promoCode.trim(),
      },
      { onSuccess: () => setForm(EMPTY_FORM) },
    );
  }

  const canBroadcast =
    form.title.trim() &&
    form.body.trim() &&
    (isCampaign ? form.scheduledAt : form.promoCode.trim());

  return (
    <div className="promo-wrap">
      <div className="panel promo-panel">
        <h2 className="promo-panel__title">Compose Platform Promotion Push Campaign</h2>

        <div className="promo-form">
          <label className="field-label">
            Notification Type
            <select className="field-input" {...field("notificationType")}>
              <option value="PROMOS">Promos</option>
              <option value="CAMPAIGN">Campaign</option>
            </select>
          </label>

          {isCampaign && (
            <label className="field-label">
              Schedule Date & Time
              <input className="field-input" type="datetime-local" {...field("scheduledAt")} />
            </label>
          )}

          <label className="field-label">
            Title
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

          {!isCampaign && (
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
          )}

          <div className="promo-actions">
            <Button tone="quiet" disabled={isSubmitting} onClick={() => setForm(EMPTY_FORM)}>
              Clear Form
            </Button>
            <Button tone="navy" disabled={isSubmitting || !canBroadcast} onClick={handleBroadcast}>
              {isSubmitting
                ? isCampaign
                  ? "Scheduling..."
                  : "Broadcasting..."
                : isCampaign
                  ? "Schedule Campaign"
                  : "Broadcast Promo"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
