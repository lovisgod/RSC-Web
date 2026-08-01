import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { RefreshCw, Search, Users } from "lucide-react";
import type { CustomerStatus, PlatformUserListQuery } from "@rsc/contracts";

import { listPlatformUsers } from "../lib/api";

const LIMIT = 25;
const STATUS_OPTIONS: Array<["", string] | [CustomerStatus, string]> = [
  ["", "All statuses"],
  ["ACTIVE", "Active"],
  ["UNVERIFIED", "Unverified"],
  ["SUSPENDED", "Suspended"],
];

function formatDateTime(iso: string | null): string {
  if (!iso) return "No activity";

  return new Intl.DateTimeFormat("en-NG", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(iso));
}

function formatCurrency(amountMinor: number): string {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  }).format(amountMinor / 100);
}

function statusClass(status: CustomerStatus): string {
  if (status === "ACTIVE") return "status-pill--on";
  if (status === "SUSPENDED") return "status-pill--failed";
  return "status-pill--scheduled";
}

export function UsersPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<CustomerStatus | "">("");

  const query = useMemo<PlatformUserListQuery>(
    () => ({
      page,
      limit: LIMIT,
      ...(status ? { status } : {}),
      ...(search.trim() ? { q: search.trim() } : {}),
    }),
    [page, search, status],
  );

  const users = useQuery({
    queryKey: ["admin", "platform-users", query],
    queryFn: () => listPlatformUsers(query),
  });

  const rows = users.data?.users ?? [];
  const pageStart = users.data && users.data.total > 0 ? users.data.offset + 1 : 0;
  const pageEnd = users.data ? Math.min(users.data.offset + rows.length, users.data.total) : 0;

  return (
    <div className="panel orders-panel users-panel">
      <div className="orders-panel__head">
        <div>
          <h2 className="orders-panel__title">Platform Users</h2>
          <p className="recon-panel__hint">
            Customer accounts, contact channels, verification state, notification readiness, and
            order activity.
          </p>
        </div>
        <button
          type="button"
          className="orders-pagination__button"
          onClick={() => void users.refetch()}
        >
          <RefreshCw size={15} aria-hidden="true" />
          Refresh
        </button>
      </div>

      <div className="orders-filters users-filters">
        <label className="orders-search users-search">
          <Search size={16} aria-hidden="true" />
          <span className="sr-only">Search users</span>
          <input
            value={search}
            placeholder="Search name or user ID"
            onChange={(event) => {
              setPage(1);
              setSearch(event.target.value);
            }}
          />
        </label>
        <label>
          <span className="sr-only">Status</span>
          <select
            className="field-input orders-filter-select"
            value={status}
            onChange={(event) => {
              setPage(1);
              setStatus(event.target.value as CustomerStatus | "");
            }}
          >
            {STATUS_OPTIONS.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
      </div>

      {users.isError && (
        <div className="panel-state panel-state--error">
          <strong>Unable to load users</strong>
          <p>{users.error.message}</p>
        </div>
      )}

      {!users.isError && (
        <div className="audit-table-wrap users-table-wrap">
          <table className="audit-table users-table">
            <thead>
              <tr>
                <th>User</th>
                <th>Contact</th>
                <th>Status</th>
                <th>Verification</th>
                <th>Orders</th>
                <th>Last order</th>
                <th>Joined</th>
              </tr>
            </thead>
            <tbody>
              {users.isLoading && (
                <tr>
                  <td colSpan={7}>Loading users...</td>
                </tr>
              )}
              {!users.isLoading && rows.length === 0 && (
                <tr>
                  <td className="table-empty" colSpan={7}>
                    <div className="refund-empty users-empty">
                      <Users size={24} aria-hidden="true" />
                      <strong>No users found</strong>
                      <p>Try a different search or status filter.</p>
                    </div>
                  </td>
                </tr>
              )}
              {rows.map((user) => (
                <tr key={user.id}>
                  <td>
                    <strong>{user.name}</strong>
                    <small>{user.id}</small>
                  </td>
                  <td>
                    <strong>{user.email}</strong>
                    <small>{user.phone}</small>
                  </td>
                  <td>
                    <span className={`status-pill ${statusClass(user.status)}`}>{user.status}</span>
                    <small>{user.hasDeviceToken ? "Push enabled" : "No push token"}</small>
                  </td>
                  <td>
                    <div className="users-verification">
                      <span
                        className={
                          user.emailVerifiedAt ? "users-chip users-chip--ok" : "users-chip"
                        }
                      >
                        Email
                      </span>
                      <span
                        className={
                          user.phoneVerifiedAt ? "users-chip users-chip--ok" : "users-chip"
                        }
                      >
                        Phone
                      </span>
                    </div>
                  </td>
                  <td>
                    <strong>{user.orderCount.toLocaleString()} orders</strong>
                    <small>{formatCurrency(user.totalSpendMinor)}</small>
                  </td>
                  <td>{formatDateTime(user.lastOrderAt)}</td>
                  <td>{formatDateTime(user.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {users.data && (
        <div className="orders-pagination audit-pagination">
          <button
            type="button"
            className="orders-pagination__button"
            disabled={!users.data.hasPrevious}
            onClick={() => setPage(Math.max(1, page - 1))}
          >
            Previous
          </button>
          <p className="orders-pagination-hint">
            Showing {pageStart}-{pageEnd} of {users.data.total} users
          </p>
          <button
            type="button"
            className="orders-pagination__button"
            disabled={!users.data.hasNext}
            onClick={() => setPage(page + 1)}
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
