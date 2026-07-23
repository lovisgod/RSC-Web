import type {
  NotificationCampaign,
  NotificationCampaignStatus,
  NotificationCampaignTargetSegment,
  Promo,
  UpdatePromoInput,
} from "@rsc/contracts";
import { Button } from "@rsc/ui";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  CalendarClock,
  CheckCircle2,
  Edit3,
  Loader2,
  Megaphone,
  PauseCircle,
  Plus,
  Send,
  X,
} from "lucide-react";
import { useMemo, useState } from "react";

import { useSendPromo } from "../hooks/use-send-promo";
import {
  listNotificationCampaigns,
  listOutlets,
  listPromoNotifications,
  scheduleNotificationCampaign,
  togglePromoActive,
  updatePromo,
} from "../lib/api";
import { toastBus } from "../lib/toast-bus";

type NotificationType = "PROMO" | "CAMPAIGN";
type ManagementTab = "PROMOS" | "CAMPAIGNS";

const promosQueryKey = ["promos"] as const;
const campaignsQueryKey = ["notification-campaigns"] as const;

const EMPTY_FORM = {
  notificationType: "PROMO" as NotificationType,
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
  scheduledAt: "",
};

type PromoEditForm = {
  title: string;
  body: string;
  discountTarget: "DELIVERY" | "ORDER";
  discountPercent: string;
  scope: "ALL_OUTLETS" | "OUTLET";
  outletId: string;
  startsAt: string;
  endsAt: string;
};

const segmentLabels: Record<NotificationCampaignTargetSegment, string> = {
  ALL_CUSTOMERS: "All customers",
  ACTIVE_CUSTOMERS: "Active customers",
  CUSTOMERS_WITH_DEVICE_TOKEN: "Device-token customers",
};

const campaignStatusLabels: Record<NotificationCampaignStatus, string> = {
  SCHEDULED: "Scheduled",
  DISPATCHING: "Dispatching",
  SENT: "Sent",
  FAILED: "Failed",
};

function toDateTimeLocalValue(value: string) {
  const date = new Date(value);
  const offsetDate = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return offsetDate.toISOString().slice(0, 16);
}

function formatDateTime(value: string | null) {
  if (!value) return "Not available";

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function isPromoLive(promo: Promo, now: number) {
  return (
    promo.isActive &&
    new Date(promo.startsAt).getTime() <= now &&
    new Date(promo.endsAt).getTime() >= now
  );
}

function isCampaignUpcoming(campaign: NotificationCampaign, now: number) {
  return campaign.status === "SCHEDULED" && new Date(campaign.scheduledAt).getTime() > now;
}

function promoToForm(promo: Promo): PromoEditForm {
  return {
    title: promo.title,
    body: promo.body,
    discountTarget: promo.discountTarget,
    discountPercent: String(promo.discountPercent),
    scope: promo.scope,
    outletId: promo.outletId ?? "",
    startsAt: toDateTimeLocalValue(promo.startsAt),
    endsAt: toDateTimeLocalValue(promo.endsAt),
  };
}

function StatCard({
  label,
  value,
  tone = "navy",
}: {
  label: string;
  value: string | number;
  tone?: "navy" | "green" | "orange";
}) {
  return (
    <div className={`promo-stat promo-stat--${tone}`}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function PromoEditModal({
  promo,
  outlets,
  onClose,
  onSave,
  saving,
}: {
  promo: Promo;
  outlets: Array<{ id: string; name: string }>;
  onClose: () => void;
  onSave: (body: UpdatePromoInput) => void;
  saving: boolean;
}) {
  const [form, setForm] = useState(() => promoToForm(promo));

  function update<K extends keyof PromoEditForm>(key: K, value: PromoEditForm[K]) {
    setForm((current) => ({
      ...current,
      [key]: value,
      ...(key === "scope" && value === "ALL_OUTLETS" ? { outletId: "" } : {}),
    }));
  }

  function submit() {
    if (!form.title.trim() || !form.body.trim() || !form.startsAt || !form.endsAt) return;
    if (form.scope === "OUTLET" && !form.outletId) return;

    onSave({
      title: form.title.trim(),
      body: form.body.trim(),
      discountTarget: form.discountTarget,
      discountPercent: Number(form.discountPercent),
      scope: form.scope,
      outletId: form.scope === "OUTLET" ? form.outletId : null,
      startsAt: new Date(form.startsAt).toISOString(),
      endsAt: new Date(form.endsAt).toISOString(),
    });
  }

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="promo-edit-title"
        className="promo-edit-modal"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="promo-edit-modal__head">
          <div>
            <p className="kicker">Promo control</p>
            <h2 id="promo-edit-title">Edit {promo.code}</h2>
          </div>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Close">
            <X size={18} aria-hidden="true" />
          </button>
        </div>

        <div className="promo-edit-grid">
          <label className="field-label">
            Title
            <input
              className="field-input"
              value={form.title}
              onChange={(event) => update("title", event.target.value)}
            />
          </label>

          <label className="field-label">
            Promo message
            <textarea
              className="field-input field-input--textarea"
              value={form.body}
              onChange={(event) => update("body", event.target.value)}
            />
          </label>

          <div className="modal-row">
            <label className="field-label">
              Discount applies to
              <select
                className="field-input"
                value={form.discountTarget}
                onChange={(event) =>
                  update("discountTarget", event.target.value as PromoEditForm["discountTarget"])
                }
              >
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
                value={form.discountPercent}
                onChange={(event) => update("discountPercent", event.target.value)}
              />
            </label>
          </div>

          <div className="modal-row">
            <label className="field-label">
              Scope
              <select
                className="field-input"
                value={form.scope}
                onChange={(event) => update("scope", event.target.value as PromoEditForm["scope"])}
              >
                <option value="ALL_OUTLETS">All outlets</option>
                <option value="OUTLET">Specific outlet</option>
              </select>
            </label>

            {form.scope === "OUTLET" && (
              <label className="field-label">
                Outlet
                <select
                  className="field-input"
                  value={form.outletId}
                  onChange={(event) => update("outletId", event.target.value)}
                >
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
              <input
                className="field-input"
                type="datetime-local"
                value={form.startsAt}
                onChange={(event) => update("startsAt", event.target.value)}
              />
            </label>

            <label className="field-label">
              Ends
              <input
                className="field-input"
                type="datetime-local"
                value={form.endsAt}
                onChange={(event) => update("endsAt", event.target.value)}
              />
            </label>
          </div>
        </div>

        <div className="promo-actions">
          <Button tone="quiet" disabled={saving} onClick={onClose}>
            Cancel
          </Button>
          <Button tone="navy" disabled={saving} onClick={submit}>
            {saving ? "Saving..." : "Save promo"}
          </Button>
        </div>
      </div>
    </div>
  );
}

function PromoCard({
  promo,
  outletName,
  onEdit,
  onToggle,
  toggling,
  now,
}: {
  promo: Promo;
  outletName: string;
  onEdit: () => void;
  onToggle: () => void;
  toggling: boolean;
  now: number;
}) {
  const starts = new Date(promo.startsAt).getTime();
  const ends = new Date(promo.endsAt).getTime();
  const lifecycle = now < starts ? "Scheduled" : now > ends ? "Expired" : "Live window";
  const live = isPromoLive(promo, now);

  return (
    <article className={`promo-management-card ${live ? "" : "is-muted"}`}>
      <div className="promo-management-card__top">
        <div>
          <span className="promo-code-chip">{promo.code}</span>
          <h3>{promo.title}</h3>
          <p>{promo.body}</p>
        </div>
        <span className={`promo-active-pill ${live ? "is-on" : "is-off"}`}>
          {live
            ? "Active"
            : lifecycle === "Expired"
              ? "Expired"
              : promo.isActive
                ? "Scheduled"
                : "Paused"}
        </span>
      </div>

      <div className="promo-meta-grid">
        <span>
          <strong>{promo.discountPercent}%</strong>
          {promo.discountTarget === "DELIVERY" ? "Delivery" : "Order"}
        </span>
        <span>
          <strong>{promo.scope === "ALL_OUTLETS" ? "All outlets" : outletName}</strong>
          Scope
        </span>
        <span>
          <strong>{lifecycle}</strong>
          {formatDateTime(promo.startsAt)}
        </span>
      </div>

      <div className="promo-card-actions">
        <button type="button" className="promo-action-btn" onClick={onEdit}>
          <Edit3 size={15} aria-hidden="true" />
          Edit
        </button>
        <button
          type="button"
          className={`promo-action-btn ${promo.isActive ? "is-danger" : "is-success"}`}
          onClick={onToggle}
          disabled={toggling}
        >
          {toggling ? (
            <Loader2 size={15} className="spin" aria-hidden="true" />
          ) : promo.isActive ? (
            <PauseCircle size={15} aria-hidden="true" />
          ) : (
            <CheckCircle2 size={15} aria-hidden="true" />
          )}
          {promo.isActive ? "Turn off" : "Turn on"}
        </button>
      </div>
    </article>
  );
}

function CampaignCard({ campaign }: { campaign: NotificationCampaign }) {
  return (
    <article className="promo-management-card campaign-card">
      <div className="promo-management-card__top">
        <div>
          <span className={`campaign-status-pill status-pill--${campaign.status.toLowerCase()}`}>
            {campaignStatusLabels[campaign.status]}
          </span>
          <h3>{campaign.title}</h3>
          <p>{campaign.body}</p>
        </div>
        <CalendarClock size={22} aria-hidden="true" />
      </div>

      <div className="promo-meta-grid">
        <span>
          <strong>{segmentLabels[campaign.targetSegment]}</strong>
          Segment
        </span>
        <span>
          <strong>{formatDateTime(campaign.scheduledAt)}</strong>
          Scheduled
        </span>
        <span>
          <strong>
            {campaign.sentCount.toLocaleString()} / {campaign.totalTargeted.toLocaleString()}
          </strong>
          Sent / Targeted
        </span>
      </div>

      {campaign.failureReason && <p className="campaign-failure">{campaign.failureReason}</p>}
    </article>
  );
}

export function PromotionsPage() {
  const queryClient = useQueryClient();
  const [form, setForm] = useState(EMPTY_FORM);
  const [activeTab, setActiveTab] = useState<ManagementTab>("PROMOS");
  const [createOpen, setCreateOpen] = useState(false);
  const [editingPromo, setEditingPromo] = useState<Promo | null>(null);
  const [currentTime] = useState(() => Date.now());
  const { mutate: sendPromo, isPending } = useSendPromo();
  const { data: outlets = [] } = useQuery({ queryKey: ["outlets"], queryFn: listOutlets });
  const promos = useQuery({ queryKey: promosQueryKey, queryFn: listPromoNotifications });
  const campaigns = useQuery({
    queryKey: campaignsQueryKey,
    queryFn: listNotificationCampaigns,
  });

  const outletNameById = useMemo(
    () => new Map(outlets.map((outlet) => [outlet.id, outlet.name])),
    [outlets],
  );

  const scheduleCampaign = useMutation({
    mutationFn: scheduleNotificationCampaign,
    onSuccess: async () => {
      toastBus.emit("Campaign scheduled successfully", "success");
      setForm(EMPTY_FORM);
      setCreateOpen(false);
      await queryClient.invalidateQueries({ queryKey: campaignsQueryKey });
    },
    onError: (err: Error) => toastBus.emit(err.message, "error"),
  });

  const savePromo = useMutation({
    mutationFn: ({ id, body }: { id: string; body: UpdatePromoInput }) => updatePromo(id, body),
    onSuccess: async () => {
      toastBus.emit("Promo updated", "success");
      setEditingPromo(null);
      await queryClient.invalidateQueries({ queryKey: promosQueryKey });
    },
    onError: (err: Error) => toastBus.emit(err.message, "error"),
  });

  const togglePromo = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      togglePromoActive(id, { isActive }),
    onSuccess: async () => {
      toastBus.emit("Promo active state updated", "success");
      await queryClient.invalidateQueries({ queryKey: promosQueryKey });
    },
    onError: (err: Error) => toastBus.emit(err.message, "error"),
  });

  const isCampaign = form.notificationType === "CAMPAIGN";
  const isPromo = form.notificationType === "PROMO";
  const isSubmitting = isPending || scheduleCampaign.isPending;
  const activePromos = (promos.data ?? []).filter((promo) =>
    isPromoLive(promo, currentTime),
  ).length;
  const scheduledCampaigns = (campaigns.data ?? []).filter((campaign) =>
    isCampaignUpcoming(campaign, currentTime),
  ).length;

  function field(key: keyof typeof EMPTY_FORM) {
    return {
      value: form[key],
      onChange: (
        event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
      ) => setForm((previous) => ({ ...previous, [key]: event.target.value })),
    };
  }

  function selectNotificationType(notificationType: NotificationType) {
    setForm((previous) => ({
      ...previous,
      notificationType,
      ...(notificationType === "CAMPAIGN"
        ? {
            promoCode: "",
            discountTarget: EMPTY_FORM.discountTarget,
            discountPercent: EMPTY_FORM.discountPercent,
            scope: EMPTY_FORM.scope,
            outletId: "",
            startsAt: "",
            endsAt: "",
          }
        : {
            scheduledAt: "",
          }),
    }));
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

    if (!isPromo) return;

    if (
      !form.promoCode.trim() ||
      !form.startsAt ||
      !form.endsAt ||
      (form.scope === "OUTLET" && !form.outletId)
    ) {
      return;
    }

    sendPromo(
      {
        type: "PROMO",
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
      {
        onSuccess: async () => {
          setForm(EMPTY_FORM);
          setCreateOpen(false);
          await queryClient.invalidateQueries({ queryKey: promosQueryKey });
        },
      },
    );
  }

  const canBroadcast =
    form.title.trim() &&
    form.body.trim() &&
    (isCampaign
      ? form.scheduledAt
      : form.promoCode.trim() &&
        form.startsAt &&
        form.endsAt &&
        (form.scope !== "OUTLET" || form.outletId));

  const composerForm = (
    <div className="promo-form">
      <label className="field-label">
        Notification Type
        <div className="notification-type-selector" role="group" aria-label="Notification type">
          <button
            type="button"
            className={`notification-type-selector__option ${
              isPromo ? "notification-type-selector__option--active" : ""
            }`}
            onClick={() => selectNotificationType("PROMO")}
          >
            Promos
          </button>
          <button
            type="button"
            className={`notification-type-selector__option ${
              isCampaign ? "notification-type-selector__option--active" : ""
            }`}
            onClick={() => selectNotificationType("CAMPAIGN")}
          >
            Campaign
          </button>
        </div>
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
        <>
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
        </>
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
  );

  return (
    <div className="promo-page">
      <section className="promo-hero panel">
        <div>
          <div className="promo-section-title-row">
            <div>
              <p className="kicker">Promotions composer</p>
              <h1>Create offers customers can act on</h1>
            </div>
            <Megaphone aria-hidden="true" size={34} />
          </div>
          <p>
            Broadcast promo codes immediately or schedule campaign messages, then manage what is
            live from the control section below.
          </p>
        </div>
      </section>

      <section className="panel promo-management">
        <div className="promo-management__head">
          <div>
            <div className="promo-section-title-row">
              <div>
                <p className="kicker">Control center</p>
                <h2>Promotions & Campaigns</h2>
              </div>
              <button
                type="button"
                className="promo-refresh-btn"
                onClick={() => setCreateOpen(true)}
              >
                <Plus size={16} aria-hidden="true" />
                Create
              </button>
            </div>
            <p>Review what customers can see, pause stale offers, and audit campaign delivery.</p>
          </div>
        </div>

        <div className="promo-stats-row">
          <StatCard label="Total promos" value={promos.data?.length ?? 0} />
          <StatCard label="Active promos" value={activePromos} tone="green" />
          <StatCard label="Campaigns" value={campaigns.data?.length ?? 0} tone="orange" />
          <StatCard label="Scheduled" value={scheduledCampaigns} />
        </div>

        <div className="promo-management-tabs" role="tablist" aria-label="Promotion controls">
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "PROMOS"}
            className={activeTab === "PROMOS" ? "is-active" : ""}
            onClick={() => setActiveTab("PROMOS")}
          >
            Promo offers
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "CAMPAIGNS"}
            className={activeTab === "CAMPAIGNS" ? "is-active" : ""}
            onClick={() => setActiveTab("CAMPAIGNS")}
          >
            Campaigns
          </button>
        </div>

        {activeTab === "PROMOS" ? (
          promos.isLoading ? (
            <div className="state-row">
              <Loader2 aria-hidden="true" className="spin" size={18} />
              <span>Loading promo offers</span>
            </div>
          ) : promos.isError ? (
            <div className="promo-empty-state">
              <strong>Promo offers could not be loaded.</strong>
              <button type="button" onClick={() => void promos.refetch()}>
                Try again
              </button>
            </div>
          ) : (promos.data ?? []).length === 0 ? (
            <div className="promo-empty-state">
              <Send size={30} aria-hidden="true" />
              <strong>No promos yet</strong>
              <span>Create a promo above and it will appear here.</span>
            </div>
          ) : (
            <div className="promo-management-grid">
              {(promos.data ?? []).map((promo) => (
                <PromoCard
                  key={promo.id}
                  promo={promo}
                  outletName={outletNameById.get(promo.outletId ?? "") ?? "Selected outlet"}
                  onEdit={() => setEditingPromo(promo)}
                  onToggle={() => togglePromo.mutate({ id: promo.id, isActive: !promo.isActive })}
                  toggling={togglePromo.isPending}
                  now={currentTime}
                />
              ))}
            </div>
          )
        ) : campaigns.isLoading ? (
          <div className="state-row">
            <Loader2 aria-hidden="true" className="spin" size={18} />
            <span>Loading campaigns</span>
          </div>
        ) : campaigns.isError ? (
          <div className="promo-empty-state">
            <strong>Campaigns could not be loaded.</strong>
            <button type="button" onClick={() => void campaigns.refetch()}>
              Try again
            </button>
          </div>
        ) : (campaigns.data ?? []).length === 0 ? (
          <div className="promo-empty-state">
            <CalendarClock size={30} aria-hidden="true" />
            <strong>No campaigns yet</strong>
            <span>Scheduled campaigns will appear here with delivery reports.</span>
          </div>
        ) : (
          <div className="promo-management-grid">
            {(campaigns.data ?? []).map((campaign) => (
              <CampaignCard key={campaign.id} campaign={campaign} />
            ))}
          </div>
        )}
      </section>

      {editingPromo && (
        <PromoEditModal
          promo={editingPromo}
          outlets={outlets}
          saving={savePromo.isPending}
          onClose={() => setEditingPromo(null)}
          onSave={(body) => savePromo.mutate({ id: editingPromo.id, body })}
        />
      )}

      {createOpen && (
        <div
          className="modal-backdrop"
          role="presentation"
          onMouseDown={() => {
            if (!isSubmitting) setCreateOpen(false);
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="promo-create-title"
            className="promo-edit-modal promo-create-modal"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="promo-edit-modal__head">
              <div>
                <p className="kicker">Create</p>
                <h2 id="promo-create-title">New promotion or campaign</h2>
              </div>
              <button
                type="button"
                className="icon-btn"
                onClick={() => setCreateOpen(false)}
                disabled={isSubmitting}
                aria-label="Close create promotion modal"
              >
                <X size={18} aria-hidden="true" />
              </button>
            </div>

            {composerForm}
          </div>
        </div>
      )}
    </div>
  );
}
