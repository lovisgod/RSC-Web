"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Bell,
  CheckCircle2,
  Clock,
  ExternalLink,
  Flame,
  Percent,
  RefreshCw,
  ShoppingBag,
  Sparkles,
  Tag,
  Truck,
  Utensils,
  XCircle,
} from "lucide-react";
import type { Notification, Promo } from "@rsc/contracts";

import { apiClient } from "@/src/lib/api";
import { useNotifications, usePromoNotifications } from "@/src/hooks/use-notifications";
import { useAuthStore } from "@/src/stores/auth-store";

type FilterTab = "all" | "orders" | "promos";

function formatRelativeTime(dateString: string): string {
  try {
    const diff = Date.now() - new Date(dateString).getTime();
    const mins = Math.floor(diff / (1000 * 60));
    if (mins < 1) return "Just now";
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d ago`;
    return new Date(dateString).toLocaleDateString("en-NG", {
      month: "short",
      day: "numeric",
    });
  } catch {
    return "Recently";
  }
}

export function NotificationsView() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<FilterTab>("all");
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const isSignedIn = useAuthStore((s) => s.isSignedIn);
  const notificationsQuery = useNotifications();
  const promosQuery = usePromoNotifications();

  const markReadMutation = useMutation({
    mutationFn: (id: string) => apiClient.markNotificationRead(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  const notifications = useMemo(() => notificationsQuery.data ?? [], [notificationsQuery.data]);

  const promos = useMemo(
    () => (promosQuery.data ?? []).filter((p) => p.isActive),
    [promosQuery.data],
  );

  const unreadCount = useMemo(() => notifications.filter((n) => !n.isRead).length, [notifications]);

  function handleCopy(code: string) {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      void navigator.clipboard.writeText(code);
      setCopiedCode(code);
      setTimeout(() => setCopiedCode(null), 2500);
    }
  }

  function handleMarkAllRead() {
    const unread = notifications.filter((n) => !n.isRead);
    unread.forEach((n) => markReadMutation.mutate(n.id));
  }

  const filteredNotifications = useMemo(() => {
    if (activeTab === "orders") {
      return notifications.filter((n) => n.type.toLowerCase().includes("order") || n.data?.orderId);
    }
    if (activeTab === "promos") {
      return notifications.filter(
        (n) => n.type.toLowerCase().includes("promo") || n.type.toLowerCase().includes("discount"),
      );
    }
    return notifications;
  }, [notifications, activeTab]);

  const isLoading = notificationsQuery.isPending || promosQuery.isPending;

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      {/* Top Controls: Filter Tabs + Mark as read */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-2 border-b border-gray-100 dark:border-gray-800">
        <div className="flex items-center gap-2 p-1 rounded-xl bg-gray-100 dark:bg-gray-800/60">
          <button
            type="button"
            onClick={() => setActiveTab("all")}
            className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${
              activeTab === "all"
                ? "bg-white dark:bg-gray-900 text-gray-900 dark:text-white shadow-sm"
                : "text-gray-500 hover:text-gray-900 dark:hover:text-white"
            }`}
          >
            All {notifications.length > 0 && `(${notifications.length})`}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("orders")}
            className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${
              activeTab === "orders"
                ? "bg-white dark:bg-gray-900 text-gray-900 dark:text-white shadow-sm"
                : "text-gray-500 hover:text-gray-900 dark:hover:text-white"
            }`}
          >
            Orders
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("promos")}
            className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${
              activeTab === "promos"
                ? "bg-white dark:bg-gray-900 text-gray-900 dark:text-white shadow-sm"
                : "text-gray-500 hover:text-gray-900 dark:hover:text-white"
            }`}
          >
            Promos & Offers {promos.length > 0 && `(${promos.length})`}
          </button>
        </div>

        {unreadCount > 0 && (
          <button
            type="button"
            onClick={handleMarkAllRead}
            disabled={markReadMutation.isPending}
            className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1.5"
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Mark all as read ({unreadCount})</span>
          </button>
        )}
      </div>

      {/* Featured Promo Offers Carousel/Banner (if any) */}
      {(activeTab === "all" || activeTab === "promos") && promos.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
            <Flame className="w-4 h-4" />
            <span>Active Discount Vouchers</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {promos.map((promo) => (
              <div
                key={promo.id}
                className="relative overflow-hidden rounded-2xl p-4 border border-emerald-500/20 bg-gradient-to-br from-emerald-950/40 via-emerald-900/20 to-transparent dark:from-emerald-950/60 dark:to-transparent flex flex-col justify-between gap-3 shadow-md"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="inline-flex items-center gap-1 text-[11px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 mb-1">
                      <Sparkles className="w-3 h-3" />
                      {promo.discountPercent}% OFF {promo.discountTarget}
                    </span>
                    <h3 className="text-sm font-bold text-gray-900 dark:text-white">
                      {promo.title}
                    </h3>
                    <p className="text-xs text-gray-600 dark:text-gray-300 mt-0.5 line-clamp-2">
                      {promo.body}
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-2 pt-2 border-t border-emerald-500/15">
                  <div className="flex items-center gap-1.5 font-mono text-xs font-bold text-emerald-400 bg-black/40 px-2.5 py-1 rounded-lg border border-emerald-500/30">
                    <Tag className="w-3.5 h-3.5" />
                    <span>{promo.code}</span>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleCopy(promo.code)}
                    className="px-3 py-1 text-xs font-bold rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white transition-colors cursor-pointer"
                  >
                    {copiedCode === promo.code ? "COPIED!" : "Copy Code"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Notifications List */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-20 rounded-2xl bg-gray-100 dark:bg-gray-800/40 animate-pulse"
            />
          ))}
        </div>
      ) : filteredNotifications.length === 0 && (activeTab !== "promos" || promos.length === 0) ? (
        <div className="flex flex-col items-center justify-center py-16 px-4 text-center rounded-3xl border border-dashed border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/30">
          <div className="w-14 h-14 rounded-2xl grid place-items-center bg-emerald-500/10 text-emerald-500 mb-3">
            <Bell className="w-7 h-7" />
          </div>
          <h3 className="text-base font-bold text-gray-900 dark:text-white">
            No notifications yet
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 max-w-sm mt-1">
            When you place orders or receive kitchen specials and promo codes, they will appear
            right here.
          </p>
          <Link
            href="/outlets"
            className="mt-5 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white transition-colors"
          >
            <Utensils className="w-3.5 h-3.5" />
            <span>Explore Kitchens</span>
          </Link>
        </div>
      ) : (
        <div className="space-y-2.5">
          {filteredNotifications.map((item) => {
            const isOrder =
              item.type.toLowerCase().includes("order") || Boolean(item.data?.orderId);
            const isPromo =
              item.type.toLowerCase().includes("promo") || Boolean(item.data?.promoCode);

            return (
              <div
                key={item.id}
                onClick={() => {
                  if (!item.isRead) markReadMutation.mutate(item.id);
                }}
                className={`relative flex items-start gap-3.5 p-4 rounded-2xl border transition-all cursor-pointer ${
                  !item.isRead
                    ? "bg-emerald-50/30 dark:bg-emerald-950/20 border-emerald-500/30 shadow-sm"
                    : "bg-white dark:bg-gray-900/60 border-gray-200/80 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700"
                }`}
              >
                {/* Type Icon */}
                <div
                  className={`w-10 h-10 rounded-xl shrink-0 grid place-items-center ${
                    isOrder
                      ? "bg-blue-500/10 text-blue-500"
                      : isPromo
                        ? "bg-amber-500/10 text-amber-500"
                        : "bg-emerald-500/10 text-emerald-500"
                  }`}
                >
                  {isOrder ? (
                    <Truck className="w-5 h-5" />
                  ) : isPromo ? (
                    <Percent className="w-5 h-5" />
                  ) : (
                    <Bell className="w-5 h-5" />
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <h4 className="text-sm font-bold text-gray-900 dark:text-white truncate">
                      {item.title}
                    </h4>
                    <span className="text-[11px] font-medium text-gray-400 shrink-0">
                      {formatRelativeTime(item.createdAt)}
                    </span>
                  </div>

                  <p className="text-xs text-gray-600 dark:text-gray-300 mt-0.5 leading-relaxed">
                    {item.body}
                  </p>

                  {/* Actions / Deep links */}
                  {Boolean(item.data?.orderId) && (
                    <Link
                      href={`/tracking?orderId=${encodeURIComponent(String(item.data?.orderId))}`}
                      className="mt-2.5 inline-flex items-center gap-1 text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline"
                    >
                      <span>Track Order</span>
                      <ExternalLink className="w-3 h-3" />
                    </Link>
                  )}
                </div>

                {/* Unread indicator */}
                {!item.isRead && (
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0 mt-1 shadow-sm shadow-emerald-500/50" />
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
