import Link from "next/link";
import { Clock10Icon, StarIcon } from "lucide-react";

import { formatOutletRating, type Outlet } from "@/src/lib/data/outlets";

export function OutletCard({ outlet }: { outlet: Outlet }) {
  const isOffline = outlet.isOnline === false;
  const card = (
    <article
      data-disabled={isOffline}
      className={`overflow-hidden rounded-2xl bg-white shadow-[0_8px_22px_rgba(30,49,96,0.10)] transition-shadow ${isOffline ? "opacity-65" : "group-hover:shadow-[0_12px_28px_rgba(30,49,96,0.16)]"}`}
    >
      <div
        className="relative flex h-36 items-center justify-center sm:h-44"
        style={{ backgroundColor: outlet.headerColor }}
      >
        {outlet.logoUrl ? (
          <img
            src={outlet.logoUrl}
            alt={`${outlet.name} logo`}
            className="max-h-[72%] max-w-[78%] object-contain"
          />
        ) : null}
        {outlet.tag ? (
          <span className="absolute left-2 top-2 rounded-full bg-[var(--rsc-brand)] px-2.5 py-0.5 text-xs font-semibold text-white">
            {outlet.tag}
          </span>
        ) : null}
      </div>
      <div className="flex flex-col gap-1 p-3 sm:p-4">
        <h3 className="text-sm font-bold leading-tight text-gray-900 sm:text-base">
          {outlet.name}
        </h3>
        <p className="text-xs text-gray-400">{outlet.cuisines.join(" · ")}</p>
        <div className="mt-auto grid grid-cols-[1fr_auto_1fr] items-center pt-2 text-xs">
          <span className="inline-flex items-center gap-1 font-semibold text-[var(--rsc-brand)]">
            <StarIcon className="h-3.5 w-3.5 fill-current" />
            {formatOutletRating(outlet.rating)}
          </span>
          <span className="inline-flex items-center gap-1 text-gray-500">
            <Clock10Icon className="h-3.5 w-3.5" />
            {outlet.deliveryTime ? `${outlet.deliveryTime} mins` : "30-45 mins"}
          </span>
          <span className="justify-self-end text-xs font-semibold text-[var(--rsc-brand)] sm:text-sm">
            {isOffline ? "Offline" : "Order Now"}
          </span>
        </div>
      </div>
    </article>
  );
  return isOffline ? (
    <div className="block cursor-not-allowed">{card}</div>
  ) : (
    <Link href={`/outlets/${outlet.id}`} className="group block">
      {card}
    </Link>
  );
}
