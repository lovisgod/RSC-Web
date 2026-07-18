import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { RefreshCw, Search } from "lucide-react";

import { listAuditLogs, type AuditLogQuery } from "../lib/api";

const LIMIT = 25;

function toIsoFromLocal(value: string): string | undefined {
  if (!value) return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
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

export function AuditLogsPage() {
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState({
    action: "",
    resourceType: "",
    resourceId: "",
    actorId: "",
    dateFrom: "",
    dateTo: "",
  });

  const query = useMemo<AuditLogQuery>(
    () => ({
      page,
      limit: LIMIT,
      ...(filters.action.trim() ? { action: filters.action.trim() } : {}),
      ...(filters.resourceType.trim() ? { resourceType: filters.resourceType.trim() } : {}),
      ...(filters.resourceId.trim() ? { resourceId: filters.resourceId.trim() } : {}),
      ...(filters.actorId.trim() ? { actorId: filters.actorId.trim() } : {}),
      ...(toIsoFromLocal(filters.dateFrom) ? { dateFrom: toIsoFromLocal(filters.dateFrom) } : {}),
      ...(toIsoFromLocal(filters.dateTo) ? { dateTo: toIsoFromLocal(filters.dateTo) } : {}),
    }),
    [filters, page],
  );

  const auditLogs = useQuery({
    queryKey: ["admin", "audit-logs", query],
    queryFn: () => listAuditLogs(query),
  });
  const rows = auditLogs.data?.auditLogs ?? [];

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
          <input
            className="field-input orders-filter-select"
            placeholder="Action"
            value={filters.action}
            onChange={(event) => {
              setPage(1);
              setFilters((current) => ({ ...current, action: event.target.value }));
            }}
          />
        </label>
        <label>
          <span className="sr-only">Resource type</span>
          <input
            className="field-input orders-filter-select"
            placeholder="Resource"
            value={filters.resourceType}
            onChange={(event) => {
              setPage(1);
              setFilters((current) => ({ ...current, resourceType: event.target.value }));
            }}
          />
        </label>
        <label>
          <span className="sr-only">Resource ID</span>
          <input
            className="field-input orders-filter-select"
            placeholder="Resource ID"
            value={filters.resourceId}
            onChange={(event) => {
              setPage(1);
              setFilters((current) => ({ ...current, resourceId: event.target.value }));
            }}
          />
        </label>
        <label>
          <span className="sr-only">Actor ID</span>
          <input
            className="field-input orders-filter-select"
            placeholder="Actor ID"
            value={filters.actorId}
            onChange={(event) => {
              setPage(1);
              setFilters((current) => ({ ...current, actorId: event.target.value }));
            }}
          />
        </label>
        <input
          className="field-input orders-filter-select"
          type="datetime-local"
          value={filters.dateFrom}
          onChange={(event) => {
            setPage(1);
            setFilters((current) => ({ ...current, dateFrom: event.target.value }));
          }}
          aria-label="Date from"
        />
        <input
          className="field-input orders-filter-select"
          type="datetime-local"
          value={filters.dateTo}
          onChange={(event) => {
            setPage(1);
            setFilters((current) => ({ ...current, dateTo: event.target.value }));
          }}
          aria-label="Date to"
        />
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
        <div className="orders-pagination" aria-label="Audit logs pagination">
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
