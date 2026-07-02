"use client";

import type { Notification } from "@rsc/contracts";
import { Bell, CalendarDays, RotateCw, Tag, X } from "lucide-react";
import { useState } from "react";
import { Pagination } from "swiper/modules";
import { Swiper, SwiperSlide } from "swiper/react";

import { useNotifications } from "@/src/hooks/use-notifications";

function getOfferAppearance(type: string) {
  switch (type.toUpperCase()) {
    case "PROMO":
      return { bg: "var(--rsc-main)", Icon: Tag };
    case "SPECIAL_PERIOD":
      return { bg: "var(--rsc-dark)", Icon: CalendarDays };
    default:
      return { bg: "var(--rsc-navy-light)", Icon: Bell };
  }
}

function OfferCard({
  notification,
  onDismiss,
}: {
  notification: Notification;
  onDismiss: () => void;
}) {
  const { bg, Icon } = getOfferAppearance(notification.type);

  return (
    <article
      className="relative flex h-full w-full items-center justify-between gap-4 rounded-2xl px-5 py-4"
      style={{ backgroundColor: bg }}
    >
      <button
        type="button"
        onClick={onDismiss}
        aria-label={`Dismiss ${notification.title}`}
        className="absolute right-2.5 top-2.5 text-white/50 transition-colors hover:text-white"
      >
        <X className="h-4 w-4" aria-hidden="true" />
      </button>

      <div className="min-w-0 flex-1 pr-6">
        <p className="text-base font-bold leading-tight text-white">{notification.title}</p>
        <p className="mt-0.5 text-sm text-white/80">{notification.body}</p>
      </div>

      <span
        className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-white/15 text-white"
        aria-hidden="true"
      >
        <Icon className="h-6 w-6" />
      </span>
    </article>
  );
}

function OffersSkeleton() {
  return (
    <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2" aria-label="Loading offers">
      {[1, 2].map((item) => (
        <div key={item} className="h-24 animate-pulse rounded-2xl bg-gray-200" />
      ))}
    </div>
  );
}

export function OffersSection() {
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const { data: notifications = [], isPending, isError, refetch } = useNotifications();

  if (isPending) return <OffersSkeleton />;

  if (isError) {
    return (
      <div className="mb-6 flex items-center justify-between gap-3 rounded-2xl bg-gray-50 px-4 py-3">
        <p className="text-sm text-gray-500">Offers could not be loaded.</p>
        <button
          type="button"
          onClick={() => void refetch()}
          className="inline-flex items-center gap-1.5 text-sm font-semibold"
          style={{ color: "var(--rsc-main)" }}
        >
          <RotateCw className="h-4 w-4" aria-hidden="true" />
          Retry
        </button>
      </div>
    );
  }

  const visible = notifications.filter((notification) => !dismissed.has(notification.id));
  if (visible.length === 0) return null;

  function dismiss(id: string) {
    setDismissed((current) => new Set([...current, id]));
  }

  return (
    <section className="mb-6" aria-label="Offers and announcements">
      <div className="sm:hidden">
        <Swiper
          modules={[Pagination]}
          slidesPerView={1.08}
          spaceBetween={12}
          pagination={{ clickable: true }}
          className="!pb-8"
        >
          {visible.map((notification) => (
            <SwiperSlide key={notification.id}>
              <OfferCard notification={notification} onDismiss={() => dismiss(notification.id)} />
            </SwiperSlide>
          ))}
        </Swiper>
      </div>

      <div className="hidden gap-3 sm:grid sm:grid-cols-2">
        {visible.map((notification) => (
          <OfferCard
            key={notification.id}
            notification={notification}
            onDismiss={() => dismiss(notification.id)}
          />
        ))}
      </div>
    </section>
  );
}
