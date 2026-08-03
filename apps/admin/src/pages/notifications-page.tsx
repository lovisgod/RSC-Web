import type {
  CreateNotificationCampaignInput,
  NotificationCampaignTargetSegment,
} from "@rsc/contracts";
import { Button } from "@rsc/ui";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertCircle, CalendarClock, Loader2, Send, Smartphone } from "lucide-react";
import type { FormEvent } from "react";
import { useMemo, useState } from "react";

import { listNotificationCampaigns, scheduleNotificationCampaign } from "../lib/api";

const campaignsQueryKey = ["notification-campaigns"] as const;

const segmentLabels: Record<NotificationCampaignTargetSegment, string> = {
  ALL_CUSTOMERS: "All customers",
  ACTIVE_CUSTOMERS: "Active customers",
  CUSTOMERS_WITH_DEVICE_TOKEN: "Customers with device token",
};

const statusLabels = {
  SCHEDULED: "Scheduled",
  DISPATCHING: "Dispatching",
  SENT: "Sent",
  FAILED: "Failed",
} as const;

function defaultScheduledAt() {
  const date = new Date(Date.now() + 60 * 60 * 1000);
  date.setSeconds(0, 0);

  return toDateTimeLocalValue(date);
}

function toDateTimeLocalValue(date: Date) {
  const offsetDate = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);

  return offsetDate.toISOString().slice(0, 16);
}

function formatDateTime(value: string | null) {
  if (!value) {
    return "Not dispatched";
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function NotificationsPage() {
  const queryClient = useQueryClient();
  const minSchedule = useMemo(() => toDateTimeLocalValue(new Date()), []);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [targetSegment, setTargetSegment] =
    useState<NotificationCampaignTargetSegment>("ACTIVE_CUSTOMERS");
  const [deepLink, setDeepLink] = useState("");
  const [scheduledAt, setScheduledAt] = useState(defaultScheduledAt);

  const campaigns = useQuery({
    queryKey: campaignsQueryKey,
    queryFn: listNotificationCampaigns,
  });

  const scheduleCampaign = useMutation({
    mutationFn: (input: CreateNotificationCampaignInput) => scheduleNotificationCampaign(input),
    onSuccess: async () => {
      setTitle("");
      setBody("");
      setDeepLink("");
      setScheduledAt(defaultScheduledAt());
      await queryClient.invalidateQueries({ queryKey: campaignsQueryKey });
    },
  });

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    scheduleCampaign.mutate({
      title,
      body,
      targetSegment,
      scheduledAt: new Date(scheduledAt).toISOString(),
      ...(deepLink.trim() ? { deepLink } : {}),
    });
  }

  return (
    <>
      <section className="page-heading">
        <div>
          <p className="kicker">Push campaigns</p>
          <h1>Schedule customer notifications</h1>
          <p>Compose seasonal promotions, target customer segments, and review delivery totals.</p>
        </div>
        <Button tone="quiet" onClick={() => void campaigns.refetch()}>
          Refresh reports
        </Button>
      </section>

      <section className="campaign-layout">
        <article className="panel campaign-composer">
          <div className="panel__heading">
            <div>
              <p className="kicker">Composition</p>
              <h2>Campaign message</h2>
            </div>
            <Smartphone aria-hidden="true" size={22} />
          </div>

          <form className="campaign-form" onSubmit={handleSubmit}>
            <label className="form-field">
              <span>Title</span>
              <input
                required
                minLength={2}
                maxLength={160}
                value={title}
                onChange={(event) => setTitle(event.currentTarget.value)}
                placeholder="Weekend special"
              />
            </label>

            <label className="form-field">
              <span>Body</span>
              <textarea
                required
                minLength={2}
                maxLength={2000}
                rows={5}
                value={body}
                onChange={(event) => setBody(event.currentTarget.value)}
                placeholder="Use code WEEKEND for a seasonal discount."
              />
            </label>

            <div className="form-grid">
              <label className="form-field">
                <span>Target segment</span>
                <select
                  value={targetSegment}
                  onChange={(event) =>
                    setTargetSegment(event.currentTarget.value as NotificationCampaignTargetSegment)
                  }
                >
                  {Object.entries(segmentLabels).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="form-field">
                <span>Schedule time</span>
                <input
                  required
                  min={minSchedule}
                  type="datetime-local"
                  value={scheduledAt}
                  onChange={(event) => setScheduledAt(event.currentTarget.value)}
                />
              </label>
            </div>

            <label className="form-field">
              <span>Deep link</span>
              <input
                maxLength={512}
                value={deepLink}
                onChange={(event) => setDeepLink(event.currentTarget.value)}
                placeholder="rsc://promos/weekend"
              />
            </label>

            {scheduleCampaign.isError && (
              <div className="state-row state-row--error campaign-error">
                <AlertCircle aria-hidden="true" size={18} />
                <span>Campaign could not be scheduled.</span>
              </div>
            )}

            <Button type="submit" disabled={scheduleCampaign.isPending}>
              {scheduleCampaign.isPending ? (
                <Loader2 aria-hidden="true" className="spin" size={17} />
              ) : (
                <Send aria-hidden="true" size={17} />
              )}
              Schedule campaign
            </Button>
          </form>
        </article>

        <article className="panel campaign-preview">
          <div className="panel__heading">
            <div>
              <p className="kicker">Preview</p>
              <h2>Customer push</h2>
            </div>
            <CalendarClock aria-hidden="true" size={22} />
          </div>

          <div className="phone-preview" aria-label="Notification preview">
            <span className="phone-preview__app">DineOut NG</span>
            <strong>{title || "Campaign title"}</strong>
            <p>{body || "Campaign body appears here before it is scheduled."}</p>
            <small>{deepLink || "No deep link set"}</small>
          </div>

          <dl className="campaign-summary">
            <div>
              <dt>Segment</dt>
              <dd>{segmentLabels[targetSegment]}</dd>
            </div>
            <div>
              <dt>Scheduled</dt>
              <dd>{scheduledAt ? formatDateTime(new Date(scheduledAt).toISOString()) : "Unset"}</dd>
            </div>
          </dl>
        </article>

        <article className="panel panel--full">
          <div className="panel__heading">
            <div>
              <p className="kicker">Delivery reports</p>
              <h2>Campaign history</h2>
            </div>
          </div>

          {campaigns.isLoading ? (
            <div className="state-row">
              <Loader2 aria-hidden="true" className="spin" size={18} />
              <span>Loading notification campaigns</span>
            </div>
          ) : campaigns.isError ? (
            <div className="state-row state-row--error">
              <AlertCircle aria-hidden="true" size={18} />
              <span>Notification campaigns could not be loaded.</span>
            </div>
          ) : (campaigns.data ?? []).length === 0 ? (
            <div className="state-row">
              <span>No notification campaigns have been scheduled yet.</span>
            </div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Campaign</th>
                    <th>Segment</th>
                    <th>Schedule</th>
                    <th>Status</th>
                    <th>Targeted</th>
                    <th>Sent</th>
                    <th>Failed</th>
                  </tr>
                </thead>
                <tbody>
                  {(campaigns.data ?? []).map((campaign) => (
                    <tr key={campaign.id}>
                      <td>
                        <strong>{campaign.title}</strong>
                        <small className="table-note">{campaign.deepLink ?? "No deep link"}</small>
                      </td>
                      <td>{segmentLabels[campaign.targetSegment]}</td>
                      <td>
                        {formatDateTime(campaign.scheduledAt)}
                        <small className="table-note">
                          {campaign.dispatchedAt
                            ? `Dispatched ${formatDateTime(campaign.dispatchedAt)}`
                            : "Awaiting dispatch"}
                        </small>
                      </td>
                      <td>
                        <span
                          className={`status-pill status-pill--campaign status-pill--${campaign.status.toLowerCase()}`}
                        >
                          {statusLabels[campaign.status]}
                        </span>
                      </td>
                      <td>{campaign.totalTargeted.toLocaleString()}</td>
                      <td>{campaign.sentCount.toLocaleString()}</td>
                      <td>{campaign.failedCount.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </article>
      </section>
    </>
  );
}
