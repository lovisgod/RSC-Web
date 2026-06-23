// apps/web/src/app/dashboard/page.tsx
"use client";

import { Swiper, SwiperSlide } from "swiper/react";
import { Autoplay, Pagination } from "swiper/modules";
import "swiper/css";
import "swiper/css/pagination";
import { useQuery } from "@tanstack/react-query";
import { OutletCard, OfferCard } from "@rsc/ui";
import type { OutletSummary, Promos } from "@rsc/contracts";

export default function DashboardHomePage() {
  const { data: Outlets = [], isPending: outletsPending } = useQuery<OutletSummary[]>({
    queryKey: ["outlets-feed"],
    queryFn: async () => {
      return [
        {
          id: "00000000-0000-0000-0000-000000000001",
          name: "Farfallino Kitchen",
          slug: "farfallino-kitchen",
          cuisineType: "Nigerian · Spicy · Soups",
          description: null,
          imageUrl: "https://picsum.photos/seed/farfallino/80/80",
          isOnline: true,
        },
        {
          id: "00000000-0000-0000-0000-000000000002",
          name: "Black Diamond",
          slug: "black-diamond",
          cuisineType: "Cakes · Ice Cream · Pastries",
          description: null,
          imageUrl: "https://picsum.photos/seed/blackdiamond/80/80",
          isOnline: true,
        },
      ];
    },
  });
  const { data: offers = [] } = useQuery<Promos[]>({
    queryKey: ["offers"],
    queryFn: async () => {
      return [
        {
          id: "00000000-0000-0000-0000-000000000010",
          offerMessage: "50% Off Your First Order",
          description: "Valid for all Nigerian dishes",
          imageUrl: null,
          backgroundColor: "#f9f116",
        },
        {
          id: "00000000-0000-0000-0000-000000000011",
          offerMessage: "Free Delivery",
          description: "On orders above ₦10,000",
          imageUrl: null,
          backgroundColor: "#f97316",
        },
        {
          id: "00000000-0000-0000-0000-000000000012",
          offerMessage: "Buy 1 Get 1 Free",
          description: "Selected pastries only",
          imageUrl: null,
          backgroundColor: "#163a6b",
        },
      ];
    },
  });

  if (outletsPending) {
    return (
      <p className="text-center text-sm text-rsc-muted mt-10 animate-pulse">Loading outlets...</p>
    );
  }

  return (
    <div className="space-y-4 mx-auto">
      <Swiper
        modules={[Autoplay, Pagination]}
        autoplay={{ delay: 3500, disableOnInteraction: false }}
        pagination={{ clickable: true }}
        loop
        className="w-full rounded-rsc pb-8"
      >
        {offers.map((offer) => (
          <SwiperSlide key={offer.id}>
            <OfferCard Offers={offer} />
          </SwiperSlide>
        ))}
      </Swiper>

      {/* Dynamic Grid Listing */}
      <div className="flex flex-col gap-4 mx-80 mt-8">
        <h1 className="text-2xl font-extrabold tracking-tight">
          {" "}
          <span className="text-rsc-auth-strong">RSC</span>{" "}
          <span className="text-rsc-accent-deep">Food</span>{" "}
          <span className="text-rsc-auth-strong">Kitchens</span>
        </h1>
        {/* <p className="text-xs text-rsc-muted">Order your favorite meals safely below</p> */}
      </div>

      <div className="grid grid-cols-1 gap-4 mt-2  justify-items-center">
        {Outlets.map((item) => (
          <OutletCard
            key={item.id}
            Outlet={item}
            onOrder={(id) => console.log(`Routing to order channel target ID: ${id}`)}
          />
        ))}
      </div>
    </div>
  );
}
