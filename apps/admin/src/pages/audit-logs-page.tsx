import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { RefreshCw, Search } from "lucide-react";

import { listAuditLogs, type AuditLogQuery } from "../lib/api";

const LIMIT = 25;
const DATE_RANGE_OPTIONS = [
  ["", "All dates"],
  ["today", "Today"],
  ["yesterday", "Yesterday"],
  ["last7", "Last 7 days"],
  ["last30", "Last 30 days"],
] as const;

const ACTION_OPTIONS = [
  ["", "All actions"],
  ["POST", "Created / submitted"],
  ["PATCH", "Updated"],
  ["PUT", "Replaced"],
  ["DELETE", "Deleted"],
] as const;

const RESOURCE_OPTIONS = [
  ["", "All resources"],
  ["auth", "Auth"],
  ["users", "Users"],
  ["outlets", "Outlets"],
  ["menu", "Menu"],
  ["orders", "Orders"],
  ["payments", "Payments"],
  ["finance", "Finance"],
  ["delivery", "Delivery"],
  ["riders", "Riders"],
  ["notifications", "Notifications"],
  ["refunds", "Refunds"],
  ["audit-logs", "Audit logs"],
] as const;

type DateRangeOption = (typeof DATE_RANGE_OPTIONS)[number][0];
type AuditFilterKey = "action" | "resourceType" | "resourceId" | "actorId" | "dateRange";

function startOfLocalDay(date: Date): Date {
  const value = new Date(date);
  value.setHours(0, 0, 0, 0);
  return value;
}

function endOfLocalDay(date: Date): Date {
  const value = new Date(date);
  value.setHours(23, 59, 59, 999);
  return value;
}

function getDateRange(value: DateRangeOption): Pick<AuditLogQuery, "dateFrom" | "dateTo"> {
  if (!value) return {};

  const now = new Date();
  if (value === "today") {
    return {
      dateFrom: startOfLocalDay(now).toISOString(),
      dateTo: endOfLocalDay(now).toISOString(),
    };
  }

  if (value === "yesterday") {
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    return {
      dateFrom: startOfLocalDay(yesterday).toISOString(),
      dateTo: endOfLocalDay(yesterday).toISOString(),
    };
  }

  const days = value === "last7" ? 7 : 30;
  const from = new Date(now);
  from.setDate(from.getDate() - (days - 1));
  return {
    dateFrom: startOfLocalDay(from).toISOString(),
    dateTo: endOfLocalDay(now).toISOString(),
  };
}

function formatDateTime(iso: string): string {
  return new Intl.DateTimeFormat("en-NG", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(iso));
}

function metadataSummary(metadata: Record<string, unknown> | null): string {
  if (!metadata) return "—";

  const parts: string[] = [];
  const params = metadata.params;
  const body = metadata.body;

  if (params && typeof params === "object" && Object.keys(params).length > 0) {
    parts.push(`params ${JSON.stringify(params)}`);
  }
  if (body && typeof body === "object" && Object.keys(body).length > 0) {
    parts.push(`body ${JSON.stringify(body)}`);
  }

  return parts.join(" · ") || "—";
}

function uniquePresent(values: Array<string | null | undefined>): string[] {
  return Array.from(
    new Set(values.filter((value): value is string => Boolean(value?.trim()))),
  ).sort((left, right) => left.localeCompare(right));
}

export function AuditLogsPage() {
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState({
    action: "",
    resourceType: "",
    resourceId: "",
    actorId: "",
    dateRange: "" as DateRangeOption,
  });

  const query = useMemo<AuditLogQuery>(
    () => ({
      page,
      limit: LIMIT,
      ...(filters.action.trim() ? { action: filters.action.trim() } : {}),
      ...(filters.resourceType.trim() ? { resourceType: filters.resourceType.trim() } : {}),
      ...(filters.resourceId.trim() ? { resourceId: filters.resourceId.trim() } : {}),
      ...(filters.actorId.trim() ? { actorId: filters.actorId.trim() } : {}),
      ...getDateRange(filters.dateRange),
    }),
    [filters, page],
  );

  const auditLogs = useQuery({
    queryKey: ["admin", "audit-logs", query],
    queryFn: () => listAuditLogs(query),
  });
  const rows = auditLogs.data?.auditLogs ?? [];
  const resourceIdOptions = uniquePresent(rows.map((log) => log.resourceId));
  const actorIdOptions = uniquePresent(rows.map((log) => log.actorId));

  const updateFilter = (key: AuditFilterKey, value: string) => {
    setPage(1);
    setFilters((current) => ({ ...current, [key]: value }));
  };

  return (
    <div className="panel orders-panel audit-panel">
      <div className="orders-panel__head">
        <div>
          <h2 className="orders-panel__title">Audit Logs</h2>
          <p className="recon-panel__hint">
            Successful write actions across platform workflows, newest first.
          </p>
        </div>
        <button
          type="button"
          className="orders-pagination__button"
          onClick={() => void auditLogs.refetch()}
        >
          <RefreshCw size={15} aria-hidden="true" />
          Refresh
        </button>
      </div>

      <div className="orders-filters audit-filters">
        <label>
          <span className="sr-only">Action</span>
          <select
            className="field-input orders-filter-select"
            value={filters.action}
            onChange={(event) => updateFilter("action", event.target.value)}
          >
            {ACTION_OPTIONS.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span className="sr-only">Resource type</span>
          <select
            className="field-input orders-filter-select"
            value={filters.resourceType}
            onChange={(event) => updateFilter("resourceType", event.target.value)}
          >
            {RESOURCE_OPTIONS.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span className="sr-only">Resource ID</span>
          <select
            className="field-input orders-filter-select"
            value={filters.resourceId}
            onChange={(event) => updateFilter("resourceId", event.target.value)}
          >
            <option value="">All record IDs</option>
            {resourceIdOptions.map((resourceId) => (
              <option key={resourceId} value={resourceId}>
                {resourceId}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span className="sr-only">Actor ID</span>
          <select
            className="field-input orders-filter-select"
            value={filters.actorId}
            onChange={(event) => updateFilter("actorId", event.target.value)}
          >
            <option value="">All actors</option>
            {actorIdOptions.map((actorId) => (
              <option key={actorId} value={actorId}>
                {actorId}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span className="sr-only">Date range</span>
          <select
            className="field-input orders-filter-select"
            value={filters.dateRange}
            onChange={(event) => updateFilter("dateRange", event.target.value)}
          >
            {DATE_RANGE_OPTIONS.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
      </div>

      {auditLogs.isPending ? (
        <div className="panel-state">Loading audit logs…</div>
      ) : auditLogs.isError ? (
        <div className="panel-state panel-state--error">
          <strong>Could not load audit logs</strong>
          <button type="button" onClick={() => void auditLogs.refetch()}>
            Try again
          </button>
        </div>
      ) : rows.length === 0 ? (
        <div className="panel-state">
          <Search size={22} aria-hidden="true" />
          <strong>No audit logs found</strong>
          <span>Try changing the filters or date range.</span>
        </div>
      ) : (
        <div className="audit-table-wrap">
          <table className="audit-table">
            <thead>
              <tr>
                <th>Time</th>
                <th>Actor</th>
                <th>Action</th>
                <th>Resource</th>
                <th>Status</th>
                <th>Request</th>
                <th>Metadata</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((log) => (
                <tr key={log.id}>
                  <td>{formatDateTime(log.createdAt)}</td>
                  <td>
                    <span className="audit-actor-role">{log.actorRole ?? "SYSTEM"}</span>
                    <small>{log.actorId ?? "—"}</small>
                  </td>
                  <td>
                    <strong>{log.method}</strong>
                    <small>{log.path}</small>
                  </td>
                  <td>
                    <span>{log.resourceType ?? "—"}</span>
                    <small>{log.resourceId ?? "—"}</small>
                  </td>
                  <td>
                    <span className="badge badge--paid">{log.statusCode}</span>
                  </td>
                  <td>
                    <span>{log.requestId ?? "—"}</span>
                    <small>{log.ipAddress ?? "—"}</small>
                  </td>
                  <td className="audit-metadata">{metadataSummary(log.metadata)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {auditLogs.data && (
        <div className="orders-pagination audit-pagination" aria-label="Audit logs pagination">
          <button
            type="button"
            className="orders-pagination__button"
            disabled={!auditLogs.data.hasPrevious}
            onClick={() => setPage(Math.max(1, page - 1))}
          >
            Previous
          </button>
          <p className="orders-pagination-hint">
            Showing {auditLogs.data.total === 0 ? 0 : auditLogs.data.offset + 1}-
            {Math.min(auditLogs.data.offset + auditLogs.data.limit, auditLogs.data.total)} of{" "}
            {auditLogs.data.total} audit logs
          </p>
          <button
            type="button"
            className="orders-pagination__button"
            disabled={!auditLogs.data.hasNext}
            onClick={() => setPage(page + 1)}
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
