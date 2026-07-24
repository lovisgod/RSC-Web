"use client";

import type { OrderLineItem } from "@rsc/contracts";
import { useMutation, useQuery } from "@tanstack/react-query";
import { CheckCircle2, Loader2, Star, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { useCompletedOrders } from "@/src/hooks/use-orders";
import { useOutlets } from "@/src/hooks/use-outlets";
import { apiClient } from "@/src/lib/api";
import { getMutationErrorMessage } from "@/src/lib/api-error";
import { useAuthStore } from "@/src/stores/auth-store";
import { useRatingPromptStore } from "@/src/stores/rating-prompt-store";

const RATING_DELAY_MS = 30 * 60 * 1000;
const RATING_ELIGIBLE_BEFORE = Date.now() - RATING_DELAY_MS;

interface RatingGroup {
  outletId: string;
  outletName: string;
  items: OrderLineItem[];
}

function StarRating({
  itemName,
  value,
  onChange,
}: {
  itemName: string;
  value: number;
  onChange: (rating: number) => void;
}) {
  return (
    <div className="flex items-center gap-0.5" role="group" aria-label={`Rate ${itemName}`}>
      {[1, 2, 3, 4, 5].map((rating) => {
        const selected = rating <= value;

        return (
          <button
            key={rating}
            type="button"
            onClick={() => onChange(rating)}
            aria-label={`${rating} ${rating === 1 ? "star" : "stars"} for ${itemName}`}
            aria-pressed={value === rating}
            className="rounded p-1 transition hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--rsc-brand)]"
            style={{ color: selected ? "var(--rsc-brand)" : "#d1d5db" }}
          >
            <Star
              className="h-5 w-5"
              fill={selected ? "currentColor" : "none"}
              aria-hidden="true"
            />
          </button>
        );
      })}
    </div>
  );
}

function RatingModal({
  groups,
  onClose,
  onSuccess,
}: {
  groups: RatingGroup[];
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [ratings, setRatings] = useState<Record<string, number>>({});
  const selectedRatings = Object.entries(ratings).filter(([, rating]) => rating > 0);

  const mutation = useMutation({
    mutationFn: async () => {
      await Promise.all(
        selectedRatings.map(([menuItemId, rating]) =>
          apiClient.rateMenuItem(menuItemId, { rating }),
        ),
      );
    },
    onSuccess,
  });

  function handleBackdropClick(event: React.MouseEvent<HTMLDivElement>) {
    if (event.target === event.currentTarget && !mutation.isPending) onClose();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 px-4 backdrop-blur-sm"
      onClick={handleBackdropClick}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="recent-order-rating-title"
        className="flex max-h-[85vh] w-full max-w-md flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
      >
        <div className="flex items-start justify-between border-b border-gray-100 px-5 py-4">
          <div>
            <h2 id="recent-order-rating-title" className="font-bold text-gray-900">
              Rate your meals
            </h2>
            <p className="mt-0.5 text-xs text-gray-500">
              Rate any items you tried. You can skip the rest.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={mutation.isPending}
            aria-label="Close ratings"
            className="rounded-full p-2 text-gray-400 transition hover:bg-gray-100 hover:text-gray-600 disabled:opacity-40"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        <div className="space-y-5 overflow-y-auto px-5 py-4">
          {groups.map((group) => (
            <section key={group.outletId} aria-labelledby={`rating-outlet-${group.outletId}`}>
              <h3
                id={`rating-outlet-${group.outletId}`}
                className="mb-2 text-xs font-bold uppercase tracking-wide text-[var(--rsc-main)]"
              >
                {group.outletName}
              </h3>
              <div className="divide-y divide-gray-100 rounded-xl border border-gray-100">
                {group.items.map((item) => (
                  <div
                    key={item.menuItemId}
                    className="flex flex-col gap-2 px-3 py-3 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-gray-800">{item.itemNameSnapshot}</p>
                      {item.quantity > 1 && (
                        <p className="text-xs text-gray-400">Quantity {item.quantity}</p>
                      )}
                    </div>
                    <StarRating
                      itemName={item.itemNameSnapshot}
                      value={ratings[item.menuItemId!] ?? 0}
                      onChange={(rating) =>
                        setRatings((current) => ({
                          ...current,
                          [item.menuItemId!]: rating,
                        }))
                      }
                    />
                  </div>
                ))}
              </div>
            </section>
          ))}

          {mutation.isError && (
            <p role="alert" className="text-center text-xs text-red-600">
              {getMutationErrorMessage(mutation.error, {
                403: "Only customer accounts can rate meals.",
                404: "One of these meals is no longer available to rate.",
              })}
            </p>
          )}
        </div>

        <div className="border-t border-gray-100 p-5">
          <button
            type="button"
            onClick={() => mutation.mutate()}
            disabled={selectedRatings.length === 0 || mutation.isPending}
            className="flex w-full items-center justify-center gap-2 rounded-full px-5 py-3 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
            style={{ backgroundColor: "var(--rsc-main)" }}
          >
            {mutation.isPending && <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />}
            {mutation.isPending
              ? "Submitting…"
              : `Submit ${selectedRatings.length || ""} ${
                  selectedRatings.length === 1 ? "rating" : "ratings"
                }`.trim()}
          </button>
        </div>
      </div>
    </div>
  );
}

export function RecentOrderRatingPrompt() {
  const [isRating, setIsRating] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const authUserId = useAuthStore((state) => state.userId);

  const { data: profile } = useQuery({
    queryKey: ["profile", authUserId],
    queryFn: () => apiClient.getProfile(),
    enabled: Boolean(authUserId),
    staleTime: 5 * 60 * 1000,
  });
  const { data: completedOrders = [] } = useCompletedOrders();
  const { data: outlets = [] } = useOutlets();
  const promptedOrderByCustomer = useRatingPromptStore((state) => state.promptedOrderByCustomer);
  const activePromptOrderByCustomer = useRatingPromptStore(
    (state) => state.activePromptOrderByCustomer,
  );
  const hasHydrated = useRatingPromptStore((state) => state._hasHydrated);
  const markPrompted = useRatingPromptStore((state) => state.markPrompted);
  const showPrompt = useRatingPromptStore((state) => state.showPrompt);
  const dismissPrompt = useRatingPromptStore((state) => state.dismissPrompt);
  const customerId = profile?.id === authUserId ? authUserId : null;
  const activeOrderId = customerId ? (activePromptOrderByCustomer[customerId] ?? null) : null;

  const latestEligibleOrder = useMemo(
    () =>
      completedOrders
        .filter(
          (order) =>
            order.customerId === customerId &&
            order.status.toUpperCase() === "DELIVERED" &&
            new Date(order.updatedAt).getTime() <= RATING_ELIGIBLE_BEFORE,
        )
        .sort(
          (left, right) => new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime(),
        )[0] ?? null,
    [completedOrders, customerId],
  );

  const candidateOrderId =
    activeOrderId ??
    (customerId &&
    hasHydrated &&
    latestEligibleOrder &&
    promptedOrderByCustomer[customerId] !== latestEligibleOrder.id
      ? latestEligibleOrder.id
      : null);

  const { data: orderDetail } = useQuery({
    queryKey: ["order", candidateOrderId, authUserId, "rating-prompt"],
    queryFn: () => apiClient.getOrder(candidateOrderId!),
    enabled: candidateOrderId !== null && Boolean(authUserId),
    staleTime: 5 * 60 * 1000,
  });

  const rateableItems = useMemo(() => {
    if (!customerId || orderDetail?.order.customerId !== customerId) {
      return [];
    }

    const uniqueItems = new Map<string, OrderLineItem>();

    for (const item of orderDetail?.lineItems ?? []) {
      if (item.menuItemId && !uniqueItems.has(item.menuItemId)) {
        uniqueItems.set(item.menuItemId, item);
      }
    }

    return [...uniqueItems.values()];
  }, [customerId, orderDetail]);

  useEffect(() => {
    if (!customerId || !candidateOrderId || !orderDetail || activeOrderId) return;
    if (orderDetail.order.customerId !== customerId) return;

    if (rateableItems.length > 0) {
      showPrompt(customerId, candidateOrderId);
    } else {
      markPrompted(customerId, candidateOrderId);
    }
  }, [
    activeOrderId,
    candidateOrderId,
    customerId,
    markPrompted,
    orderDetail,
    rateableItems.length,
    showPrompt,
  ]);

  useEffect(() => {
    if (!isSubmitted || !customerId) return;

    const timer = window.setTimeout(() => dismissPrompt(customerId), 2500);
    return () => window.clearTimeout(timer);
  }, [customerId, dismissPrompt, isSubmitted]);

  useEffect(
    () => () => {
      if (customerId) dismissPrompt(customerId);
    },
    [customerId, dismissPrompt],
  );

  const outletById = useMemo(
    () => new Map(outlets.map((outlet) => [outlet.id, outlet.name])),
    [outlets],
  );
  const groups = useMemo(() => {
    const grouped = new Map<string, RatingGroup>();

    for (const item of rateableItems) {
      const existing = grouped.get(item.outletId);

      if (existing) {
        existing.items.push(item);
      } else {
        grouped.set(item.outletId, {
          outletId: item.outletId,
          outletName: outletById.get(item.outletId) ?? "Kitchen",
          items: [item],
        });
      }
    }

    return [...grouped.values()];
  }, [outletById, rateableItems]);

  if (!customerId || !activeOrderId || rateableItems.length === 0) return null;

  const previewNames = rateableItems.slice(0, 3).map((item) => item.itemNameSnapshot);
  const remainingCount = rateableItems.length - previewNames.length;

  return (
    <>
      <article className="mb-5 overflow-hidden rounded-2xl border border-[color:color-mix(in_srgb,var(--rsc-brand)_22%,white)] bg-[color:color-mix(in_srgb,var(--rsc-brand)_7%,white)] p-4 shadow-sm sm:p-5">
        {isSubmitted ? (
          <div className="flex items-center gap-3" role="status">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-green-100 text-green-600">
              <CheckCircle2 className="h-5 w-5" aria-hidden="true" />
            </span>
            <div>
              <h2 className="font-bold text-gray-900">Thank you for your feedback</h2>
              <p className="text-sm text-gray-500">Your meal ratings have been recorded.</p>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="text-xs font-bold uppercase tracking-wide text-[var(--rsc-brand-strong)]">
                Your last order
              </p>
              <h2 className="mt-1 text-lg font-bold text-[var(--rsc-main)]">
                How were your meals?
              </h2>
              <p className="mt-1 text-sm text-gray-600">
                {previewNames.join(", ")}
                {remainingCount > 0 ? ` and ${remainingCount} more` : ""}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <button
                type="button"
                onClick={() => dismissPrompt(customerId)}
                className="rounded-full px-4 py-2.5 text-sm font-semibold text-gray-500 transition hover:bg-white/70 hover:text-gray-700"
              >
                Not now
              </button>
              <button
                type="button"
                onClick={() => setIsRating(true)}
                className="rounded-full px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:opacity-90"
                style={{ backgroundColor: "var(--rsc-main)" }}
              >
                Rate meals
              </button>
            </div>
          </div>
        )}
      </article>

      {isRating && (
        <RatingModal
          groups={groups}
          onClose={() => setIsRating(false)}
          onSuccess={() => {
            setIsRating(false);
            setIsSubmitted(true);
          }}
        />
      )}
    </>
  );
}
