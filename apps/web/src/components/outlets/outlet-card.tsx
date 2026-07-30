import Link from "next/link";
import { Clock10Icon, StarIcon } from "lucide-react";

import { formatOutletRating, type Outlet } from "@/src/lib/data/outlets";

export function OutletCard({ outlet }: { outlet: Outlet }) {
  const isOffline = outlet.isOnline === false;
  const rating = formatOutletRating(outlet.rating);
  const deliveryTimeLabel = outlet.deliveryTime ? `${outlet.deliveryTime} mins` : "30-45 mins";
  const card = (
    <article
      data-disabled={isOffline}
      className={`bg-white rounded-2xl overflow-hidden shadow-[0_8px_22px_rgba(30,49,96,0.10)] flex flex-col transition-shadow duration-200 group-hover:shadow-[0_12px_28px_rgba(30,49,96,0.16)] ${isOffline ? "opacity-65" : ""}`}
    >
      {/* Coloured header */}
      <div
        className="relative h-36 sm:h-44 flex-shrink-0"
        style={{
          backgroundColor: outlet.headerColor,
          ...(outlet.image.startsWith("/") || outlet.image.startsWith("http")
            ? {
                backgroundImage: `url(${outlet.image})`,
                backgroundSize: "cover",
                backgroundPosition: "center",
              }
            : {}),
        }}
      >
        {(outlet.image.startsWith("/") || outlet.image.startsWith("http")) && (
          <div className="absolute inset-0 bg-black/25" />
        )}

        {outlet.tag && (
          <span
            className="absolute top-2 left-2 text-xs font-semibold text-white px-2.5 py-0.5 rounded-full z-10"
            style={{ backgroundColor: "var(--rsc-brand)" }}
          >
            {outlet.tag}
          </span>
        )}

        {!outlet.image.startsWith("/") && !outlet.image.startsWith("http") && (
          <span className="absolute inset-0 flex items-center justify-center text-5xl sm:text-7xl select-none">
            {outlet.image}
          </span>
        )}
      </div>

      {/* Content */}
      <div className="flex flex-col flex-1 p-3 sm:p-4 gap-1">
        <h3 className="font-bold text-gray-900 text-sm sm:text-base leading-tight">
          {outlet.name}
        </h3>
        <p className="text-xs text-gray-400">{outlet.cuisines.join(" · ")}</p>

        <div className="mt-auto grid grid-cols-[1fr_auto_1fr] items-center pt-2 text-xs">
          <span
            className="inline-flex items-center gap-1 justify-self-start font-semibold"
            style={{ color: "var(--rsc-brand)" }}
          >
            <StarIcon className="h-3.5 w-3.5 fill-current" aria-hidden="true" />
            {rating}
          </span>

          <span className="inline-flex items-center justify-center gap-1 text-gray-500">
            <Clock10Icon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            <span>{deliveryTimeLabel}</span>
          </span>

          <span
            className="justify-self-end text-xs font-semibold sm:text-sm"
            style={{ color: "var(--rsc-brand)" }}
          >
            {isOffline ? "Offline" : "Order Now"}
          </span>
        </div>
      </div>
    </article>
  );

  if (isOffline) {
    return <div className="block cursor-not-allowed">{card}</div>;
  }

  return (
    <Link href={`/outlets/${outlet.id}`} className="block group">
      <article className="bg-white rounded-2xl overflow-hidden shadow-[0_8px_22px_rgba(30,49,96,0.10)] flex flex-col transition-shadow duration-200 group-hover:shadow-[0_12px_28px_rgba(30,49,96,0.16)]">
        {/* Coloured header */}
        <div
          className="relative h-36 sm:h-44 flex-shrink-0"
          style={{
            backgroundColor: outlet.headerColor,
            ...(outlet.image.startsWith("/") || outlet.image.startsWith("http")
              ? {
                  backgroundImage: `url(${outlet.image})`,
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                }
              : {}),
          }}
        >
          {(outlet.image.startsWith("/") || outlet.image.startsWith("http")) && (
            <div className="absolute inset-0 bg-black/25" />
          )}

          {outlet.tag && (
            <span
              className="absolute top-2 left-2 text-xs font-semibold text-white px-2.5 py-0.5 rounded-full z-10"
              style={{ backgroundColor: "var(--rsc-brand)" }}
            >
              {outlet.tag}
            </span>
          )}

          {!outlet.image.startsWith("/") && !outlet.image.startsWith("http") && (
            <span className="absolute inset-0 flex items-center justify-center text-5xl sm:text-7xl select-none">
              {outlet.image}
            </span>
          )}
        </div>

        {/* Content */}
        <div className="flex flex-col flex-1 p-3 sm:p-4 gap-1">
          <h3 className="font-bold text-gray-900 text-sm sm:text-base leading-tight">
            {outlet.name}
          </h3>
          <p className="text-xs text-gray-400">{outlet.cuisines.join(" · ")}</p>

          <div className="mt-auto grid grid-cols-[1fr_auto_1fr] items-center pt-2 text-xs">
            <span
              className="inline-flex items-center gap-1 justify-self-start font-semibold"
              style={{ color: "var(--rsc-brand)" }}
            >
              <StarIcon className="h-3.5 w-3.5 fill-current" aria-hidden="true" />
              {rating}
            </span>

            <span className="inline-flex items-center justify-center gap-1 text-gray-500">
              <Clock10Icon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              <span>{deliveryTimeLabel}</span>
            </span>

            <span
              className="justify-self-end text-xs font-semibold sm:text-sm"
              style={{ color: "var(--rsc-brand)" }}
            >
              Order Now
            </span>
          </div>
        </div>
      </article>
    </Link>
  );
}
