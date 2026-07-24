import { Button } from "@rsc/ui";
import type { DatabaseBackupSettings } from "@rsc/contracts";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { DatabaseBackup, Play, ShieldAlert } from "lucide-react";
import { useState } from "react";

import { useAuth } from "../hooks/use-auth";
import {
  getDatabaseBackupSettings,
  runDatabaseBackupNow,
  updateDatabaseBackupSettings,
} from "../lib/api";
import { toastBus } from "../lib/toast-bus";

function formatDateTime(value: string | null): string {
  if (!value) return "Not set";
  return new Intl.DateTimeFormat("en-NG", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function formatSize(value: number | null): string {
  if (value === null) return "Not available";
  if (value < 1024) return `${value} bytes`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
  return `${(value / 1024 / 1024).toFixed(1)} MB`;
}

export function OwnerBackupsPage() {
  const { user } = useAuth();
  const settings = useQuery({
    queryKey: ["owner", "database-backups", "settings"],
    queryFn: getDatabaseBackupSettings,
    enabled: user?.role === "OWNER",
  });

  if (user?.role !== "OWNER") {
    return (
      <div className="owner-backups-denied">
        <ShieldAlert size={28} aria-hidden="true" />
        <h1>Owner access required</h1>
        <p>This internal route is reserved for the platform owner persona.</p>
      </div>
    );
  }

  return (
    <div className="settings-page owner-backups-page">
      <div className="settings-page__head">
        <p className="kicker">Owner Control</p>
        <h1>Database backups</h1>
        <p>
          Configure the internal backup schedule. The route is intentionally unlisted and can be
          opened directly at <code>/owner/backups</code>.
        </p>
      </div>

      <section className="admin-settlement-settings owner-backups-card">
        <div className="admin-settlement-settings__head">
          <span className="admin-settlement-settings__icon">
            <DatabaseBackup size={21} aria-hidden="true" />
          </span>
          <div>
            <h2>Backup schedule</h2>
            <p>
              Backups are generated with pg_dump and sent to the configured email through the active
              email provider.
            </p>
          </div>
        </div>

        {settings.isPending ? (
          <div className="panel-state">Loading backup settings…</div>
        ) : settings.isError ? (
          <div className="panel-state panel-state--error">
            <strong>Could not load backup settings</strong>
            <button type="button" onClick={() => void settings.refetch()}>
              Try again
            </button>
          </div>
        ) : (
          <OwnerBackupSettingsForm key={settings.data.updatedAt} settings={settings.data} />
        )}
      </section>
    </div>
  );
}

function OwnerBackupSettingsForm({ settings }: { settings: DatabaseBackupSettings }) {
  const queryClient = useQueryClient();
  const [recipientEmail, setRecipientEmail] = useState(settings.recipientEmail ?? "");
  const [intervalMinutes, setIntervalMinutes] = useState(String(settings.intervalMinutes));
  const [isEnabled, setIsEnabled] = useState(settings.isEnabled);

  const saveSettings = useMutation({
    mutationFn: () =>
      updateDatabaseBackupSettings({
        recipientEmail: recipientEmail.trim(),
        intervalMinutes: Number(intervalMinutes),
        isEnabled,
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["owner", "database-backups", "settings"] });
      toastBus.emit("Backup schedule updated", "success");
    },
    onError: (error: Error) => toastBus.emit(error.message, "error"),
  });

  const runNow = useMutation({
    mutationFn: runDatabaseBackupNow,
    onSuccess: async (result) => {
      await queryClient.invalidateQueries({ queryKey: ["owner", "database-backups", "settings"] });
      toastBus.emit(`Backup sent to ${result.recipientEmail}`, "success");
    },
    onError: (error: Error) => toastBus.emit(error.message, "error"),
  });

  return (
    <form
      className="admin-settlement-settings__form"
      onSubmit={(event) => {
        event.preventDefault();
        saveSettings.mutate();
      }}
      noValidate
    >
      <label className="admin-settlement-field">
        <span>Recipient email</span>
        <input
          type="email"
          value={recipientEmail}
          placeholder="owner@example.com"
          onChange={(event) => setRecipientEmail(event.target.value)}
        />
        <small>The backup dump is sent to this address as an attachment.</small>
      </label>

      <label className="admin-settlement-field">
        <span>Backup interval</span>
        <select
          value={intervalMinutes}
          onChange={(event) => setIntervalMinutes(event.target.value)}
        >
          <option value="60">Every hour</option>
          <option value="360">Every 6 hours</option>
          <option value="720">Every 12 hours</option>
          <option value="1440">Daily</option>
          <option value="10080">Weekly</option>
        </select>
      </label>

      <label className="owner-backups-toggle">
        <span>
          <strong>Scheduled backups</strong>
          <small>{isEnabled ? "Enabled" : "Disabled"}</small>
        </span>
        <input
          type="checkbox"
          checked={isEnabled}
          onChange={(event) => setIsEnabled(event.target.checked)}
        />
      </label>

      <div className="owner-backups-summary">
        <div>
          <span>Last status</span>
          <strong>{settings.lastStatus.replaceAll("_", " ")}</strong>
        </div>
        <div>
          <span>Last run</span>
          <strong>{formatDateTime(settings.lastRunAt)}</strong>
        </div>
        <div>
          <span>Next run</span>
          <strong>{formatDateTime(settings.nextRunAt)}</strong>
        </div>
        <div>
          <span>Last file</span>
          <strong>{settings.lastFileName ?? "Not available"}</strong>
          <small>{formatSize(settings.lastFileSizeBytes)}</small>
        </div>
      </div>

      {settings.lastError && (
        <p className="admin-settlement-settings__error" role="alert">
          {settings.lastError}
        </p>
      )}

      <div className="owner-backups-actions">
        <Button
          type="button"
          tone="quiet"
          disabled={runNow.isPending || saveSettings.isPending}
          onClick={() => runNow.mutate()}
        >
          <Play size={15} aria-hidden="true" />
          {runNow.isPending ? "Running…" : "Run backup now"}
        </Button>
        <Button tone="navy" type="submit" disabled={saveSettings.isPending}>
          {saveSettings.isPending ? "Saving…" : "Save schedule"}
        </Button>
      </div>
    </form>
  );
}
