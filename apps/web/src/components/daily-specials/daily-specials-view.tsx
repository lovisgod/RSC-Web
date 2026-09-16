"use client";

import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Search, Tag } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";

import { OUTLETS_QUERY } from "@/src/hooks/use-outlets";
import { formatNaira } from "@/src/lib/data/cart";
import {
  type DailySpecialItem,
  getDailySpecials,
  resolveSpecialImage,
} from "@/src/lib/data/daily-specials";

function SpecialCard({ special }: { special: DailySpecialItem }) {
  const imageUrl = resolveSpecialImage(special);
  const discountPrice =
    special.discountPriceMinor ?? special.currentPriceMinor ?? special.priceMinor;
  const originalPrice = special.priceMinor;

  return (
    <article className="flex w-full items-start gap-3 rounded-2xl border border-gray-100 bg-white p-3 text-left shadow-sm transition hover:border-[color:color-mix(in_srgb,var(--rsc-main)_18%,white)] hover:shadow-[0_10px_24px_rgba(30,49,96,0.08)]">
      <div className="grid h-20 w-20 shrink-0 place-items-center rounded-xl bg-[color:color-mix(in_srgb,var(--rsc-main)_10%,white)] text-[var(--rsc-main)]">
        {imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={imageUrl}
            alt={special.name}
            className="h-full w-full rounded-xl object-cover"
            loading="lazy"
          />
        ) : (
          <Tag className="h-7 w-7" aria-hidden="true" />
        )}
      </div>

      <div className="min-w-0 flex-1">
        <div className="mb-1 flex flex-wrap items-center gap-2">
          <span className="rounded-full border border-[color-mix(in_srgb,var(--rsc-main)_20%,transparent)] bg-[color:color-mix(in_srgb,var(--rsc-main)_12%,white)] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[var(--rsc-main)]">
            {special.outletName}
          </span>
          <span className="rounded-full bg-[color:color-mix(in_srgb,var(--rsc-brand)_14%,white)] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[var(--rsc-brand-strong)]">
            {special.discountPercent}% off
          </span>
        </div>

        <h3 className="text-sm font-bold leading-tight text-gray-900">{special.name}</h3>
        <p className="mt-0.5 line-clamp-2 text-xs text-gray-400">
          {special.description || "Today’s discounted kitchen special."}
        </p>

        <div className="mt-2 flex flex-wrap items-baseline gap-x-2 gap-y-1">
          <span className="text-sm font-extrabold text-[var(--rsc-brand)]">
            {formatNaira(discountPrice)}
          </span>
          {originalPrice > discountPrice && (
            <span className="text-xs font-semibold text-gray-400 line-through">
              {formatNaira(originalPrice)}
            </span>
          )}
        </div>
      </div>
    </article>
  );
}

function CardSkeleton() {
  return (
    <div className="flex animate-pulse items-start gap-3 rounded-2xl border border-gray-100 bg-white p-3 shadow-sm">
      <div className="h-20 w-20 shrink-0 rounded-xl bg-gray-100" />
      <div className="flex-1 space-y-2 pt-1">
        <div className="h-3 w-24 rounded-full bg-gray-100" />
        <div className="h-4 w-40 rounded-full bg-gray-200" />
        <div className="h-3 w-52 rounded-full bg-gray-100" />
        <div className="mt-2 h-3 w-32 rounded-full bg-gray-100" />
      </div>
    </div>
  );
}

export function DailySpecialsView() {
  const [input, setInput] = useState("");
  const outletsQuery = useQuery(OUTLETS_QUERY);

  const dailySpecials = useMemo(
    () => getDailySpecials(outletsQuery.data ?? []),
    [outletsQuery.data],
  );

  const visibleSpecials = useMemo(() => {
    const query = input.trim().toLowerCase();
    if (!query) return dailySpecials;

    return dailySpecials.filter((special) =>
      [special.name, special.description, special.outletName]
        .join(" ")
        .toLowerCase()
        .includes(query),
    );
  }, [dailySpecials, input]);

  return (
    <div className="flex h-full flex-col">
      <div className="sticky top-0 z-10 border-b border-gray-100 bg-white">
        <div className="flex items-center gap-3 p-4">
          <Link
            href="/"
            aria-label="Back to home"
            title="Back to home"
            className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-gray-200 bg-white text-gray-600 transition-colors hover:border-[var(--rsc-main)] hover:text-[var(--rsc-main)] dark:border-gray-800 dark:bg-gray-900 dark:text-gray-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--rsc-brand)]"
          >
            <ArrowLeft className="h-5 w-5" aria-hidden="true" />
          </Link>

          <div className="relative flex-1">
            <Search
              className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400"
              aria-hidden="true"
            />
            <input
              autoFocus
              value={input}
              onChange={(event) => setInput(event.target.value)}
              type="search"
              placeholder="Search daily specials…"
              className="w-full rounded-2xl border border-gray-200 bg-gray-50 py-3 pl-9 pr-4 text-sm transition-colors focus:border-[var(--rsc-main)] focus:bg-white focus:outline-none"
            />
          </div>
        </div>
      </div>

      <p className="px-4 pt-3 text-xs text-gray-400">
        {outletsQuery.isPending
          ? "Loading daily specials…"
          : `${visibleSpecials.length} daily special${visibleSpecials.length === 1 ? "" : "s"}`}
      </p>

      <div className="flex-1 space-y-3 overflow-y-auto p-4">
        {outletsQuery.isPending ? (
          Array.from({ length: 5 }).map((_, index) => <CardSkeleton key={index} />)
        ) : outletsQuery.isError ? (
          <div className="flex flex-col items-center justify-center gap-3 py-20 text-center">
            <p className="font-semibold text-gray-700">Daily specials could not be loaded.</p>
            <button
              type="button"
              onClick={() => void outletsQuery.refetch()}
              className="rounded-full bg-[var(--rsc-main)] px-5 py-2 text-sm font-bold text-white"
            >
              Retry
            </button>
          </div>
        ) : visibleSpecials.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-20 text-center">
            <p className="text-3xl">🔥</p>
            <p className="font-semibold text-gray-700">No daily specials found</p>
            <p className="text-sm text-gray-400">
              Try another search term, or check back for new kitchen offers.
            </p>
          </div>
        ) : (
          visibleSpecials.map((special) => <SpecialCard key={special.id} special={special} />)
        )}
      </div>
    </div>
  );
}
