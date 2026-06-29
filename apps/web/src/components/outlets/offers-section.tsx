"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { Swiper, SwiperSlide } from "swiper/react";
import { Pagination } from "swiper/modules";

interface Offer {
  id: string;
  heading: string;
  body: string;
  icon: string;
  bg: string;
}

const OFFERS: Offer[] = [
  {
    id: "free-delivery",
    heading: "Free Delivery Today!",
    body: "Enjoy free delivery on your first split order.",
    icon: "🎉",
    bg: "var(--rsc-dark)",
  },
  {
    id: "new-kitchen",
    heading: "New Kitchen Alert!",
    body: "Farfallino Kitchen is now live. Try Italian tonight.",
    icon: "🍝",
    bg: "var(--rsc-main)",
  },
];

function OfferCard({ offer, onDismiss }: { offer: Offer; onDismiss: () => void }) {
  return (
    <div
      className="relative flex items-center justify-between gap-4 rounded-2xl px-5 py-4 w-full h-full"
      style={{ backgroundColor: offer.bg }}
    >
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Dismiss offer"
        className="absolute top-2.5 right-2.5 text-white/50 hover:text-white transition-colors"
      >
        <X className="w-4 h-4" />
      </button>

      <div className="pr-6 flex-1 min-w-0">
        <p className="text-base font-bold text-white leading-tight">{offer.heading}</p>
        <p className="text-sm text-white/80 mt-0.5">{offer.body}</p>
      </div>

      <span className="text-4xl flex-shrink-0 select-none">{offer.icon}</span>
    </div>
  );
}

export function OffersSection() {
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  const visible = OFFERS.filter((o) => !dismissed.has(o.id));

  if (visible.length === 0) return null;

  function dismiss(id: string) {
    setDismissed((prev) => new Set([...prev, id]));
  }

  return (
    <div className="mb-6">
      {/* Mobile — Swiper carousel */}
      <div className="sm:hidden">
        <Swiper
          modules={[Pagination]}
          slidesPerView={1.08}
          spaceBetween={12}
          pagination={{ clickable: true }}
          className="!pb-8"
        >
          {visible.map((offer) => (
            <SwiperSlide key={offer.id}>
              <OfferCard offer={offer} onDismiss={() => dismiss(offer.id)} />
            </SwiperSlide>
          ))}
        </Swiper>
      </div>

      {/* Desktop — 2-column grid */}
      <div className="hidden sm:grid sm:grid-cols-2 gap-3">
        {visible.map((offer) => (
          <OfferCard key={offer.id} offer={offer} onDismiss={() => dismiss(offer.id)} />
        ))}
      </div>
    </div>
  );
}
