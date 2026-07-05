import Link from "next/link";
import { Clock10Icon, StarIcon } from "lucide-react";

import type { Outlet } from "@/src/lib/data/outlets";

export function OutletCard({ outlet }: { outlet: Outlet }) {
  return (
    <Link href={`/outlets/${outlet.id}`} className="block group">
      <article className="bg-white rounded-2xl overflow-hidden shadow-sm flex flex-col transition-shadow duration-200 group-hover:shadow-md">
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
              style={{ backgroundColor: "var(--rsc-dark)" }}
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

          <div className="flex items-center justify-between mt-auto pt-2">
            <div className="flex items-center gap-2 text-xs">
              {outlet.rating != null && (
                <span className="font-semibold" style={{ color: "var(--rsc-dark)" }}>
                  <StarIcon /> {outlet.rating}
                </span>
              )}
              {outlet.deliveryTime && (
                <span className="text-gray-400 hidden sm:inline">
                  <Clock10Icon /> {outlet.deliveryTime} mins{" "}
                </span>
              )}
            </div>

            <span className="text-xs sm:text-sm font-semibold" style={{ color: "var(--rsc-dark)" }}>
              Order Now
            </span>
          </div>
        </div>
      </article>
    </Link>
  );
}
