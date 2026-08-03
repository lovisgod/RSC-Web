"use client";

import type { MenuItemSummary, OutletSummary, Promo } from "@rsc/contracts";
import { Button } from "@rsc/ui";
import { useQuery } from "@tanstack/react-query";
import { SearchIcon, StarIcon } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";

import { useMenuSearch } from "@/src/hooks/use-menu-search";
import { OUTLETS_QUERY } from "@/src/hooks/use-outlets";
import { usePromoNotifications } from "@/src/hooks/use-notifications";
import { formatNaira } from "@/src/lib/data/cart";
import { formatOutletRating, toDisplayOutlet } from "@/src/lib/data/outlets";
import { BrandLogo } from "@/src/components/shared/brand-logo";

const steps = [
  {
    title: "Pick kitchens",
    copy: "Browse live outlets and see what is available before you commit.",
  },
  {
    title: "Build one cart",
    copy: "Mix dishes across outlets, add notes, and keep one clean order summary.",
  },
  {
    title: "Pay and track",
    copy: "Pay once, then follow every kitchen from preparation to pickup or delivery.",
  },
] as const;

function isPromoLive(promo: Promo): boolean {
  const now = Date.now();
  const startsAt = new Date(promo.startsAt).getTime();
  const endsAt = new Date(promo.endsAt).getTime();

  return promo.isActive && startsAt <= now && now <= endsAt;
}

function topSpecials(outlets: OutletSummary[]): Array<MenuItemSummary & { outletName: string }> {
  return outlets
    .flatMap((outlet) =>
      outlet.menuItems
        .filter((item) => item.isAvailable)
        .map((item) => ({ ...item, outletName: outlet.name })),
    )
    .sort((a, b) => {
      const aDiscount = a.isDiscountActive ? 1 : 0;
      const bDiscount = b.isDiscountActive ? 1 : 0;

      return bDiscount - aDiscount || b.ratingAverage - a.ratingAverage;
    })
    .slice(0, 4);
}

export function LandingPage() {
  const [searchInput, setSearchInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchFocused, setSearchFocused] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const outletsQuery = useQuery(OUTLETS_QUERY);
  const promosQuery = usePromoNotifications();
  const outlets = (outletsQuery.data ?? []).map((outlet, index) => toDisplayOutlet(outlet, index));
  const featuredOutlets = outlets.slice(0, 4);
  const specials = topSpecials(outletsQuery.data ?? []);
  const promos = (promosQuery.data ?? []).filter(isPromoLive);
  const heroPromo = promos[0];
  const canSearch = searchQuery.length >= 2;
  const menuSearch = useMenuSearch(searchQuery, null, { enabled: canSearch, limit: 6 });
  const searchResults = useMemo(
    () => menuSearch.data?.pages.flatMap((page) => page.items).slice(0, 6) ?? [],
    [menuSearch.data],
  );
  const outletNameMap = useMemo(
    () => new Map((outletsQuery.data ?? []).map((outlet) => [outlet.id, outlet.name])),
    [outletsQuery.data],
  );
  const showSearchDropdown = searchFocused && searchInput.trim().length > 0;

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  function handleSearchInput(value: string) {
    setSearchInput(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);

    const trimmed = value.trim();
    if (trimmed.length < 2) {
      setSearchQuery("");
      return;
    }

    debounceRef.current = setTimeout(() => setSearchQuery(trimmed), 300);
  }

  return (
    <main className="landing-shell">
      <header className="landing-header" aria-label="DineOut NG landing navigation">
        <Link className="landing-brand" href="/" aria-label="DineOut NG home">
          <BrandLogo className="w-24 sm:w-28" priority />
        </Link>

        <nav className="landing-header__nav" aria-label="Primary navigation">
          <Link href="#outlets">Outlets</Link>
          <Link href="#specials">Specials</Link>
          <Link href="/cart">Cart</Link>
        </nav>

        <Link href="/sign-in" className="landing-sign-in">
          Sign in
        </Link>
      </header>

      <section className="landing-hero">
        <div className="landing-hero__visual" aria-label="Food order preview">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/assets/cart.png" alt="" aria-hidden="true" />
          <div className="landing-hero__overlay" />
          <div className="landing-hero__badge">
            <span>{outlets.length || "Multi"}</span>
            <small>live kitchens</small>
          </div>
        </div>

        <div className="landing-hero__content">
          <p className="landing-eyebrow">One app. Many flavours. Endless choices.</p>
          <h1>Dine across DineOut NG kitchens in one clean order.</h1>
          <p>
            Browse outlets, choose meals, apply promos, pay once, and track the full order without
            juggling separate kitchen checkouts.
          </p>

          <div className="landing-search-row">
            <div className="landing-search-card" role="search">
              <SearchIcon aria-hidden="true" />
              <input
                value={searchInput}
                type="search"
                role="combobox"
                autoComplete="off"
                placeholder="Search food, cuisines"
                aria-label="Search food, cuisines"
                aria-expanded={showSearchDropdown}
                aria-controls="landing-search-results"
                aria-autocomplete="list"
                onFocus={() => setSearchFocused(true)}
                onBlur={() => setTimeout(() => setSearchFocused(false), 140)}
                onChange={(event) => handleSearchInput(event.target.value)}
              />

              {showSearchDropdown ? (
                <div
                  id="landing-search-results"
                  className="landing-search-dropdown"
                  role="listbox"
                  aria-label="Menu search results"
                >
                  {searchInput.trim().length < 2 ? (
                    <p>Type at least 2 characters to search menu items.</p>
                  ) : menuSearch.isPending || menuSearch.isFetching ? (
                    <>
                      <span className="landing-search-dropdown__skeleton" />
                      <span className="landing-search-dropdown__skeleton" />
                      <span className="landing-search-dropdown__skeleton" />
                    </>
                  ) : searchResults.length === 0 ? (
                    <p>No menu items found. Try another meal or kitchen name.</p>
                  ) : (
                    searchResults.map((item) => (
                      <Link
                        key={item.id}
                        href={`/menu/${item.id}`}
                        className="landing-search-result"
                        role="option"
                      >
                        <span className="landing-search-result__image">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={item.imageUrl ?? "/images/images/fire_1f525.png"}
                            alt=""
                            aria-hidden="true"
                          />
                        </span>
                        <span>
                          <strong>{item.name}</strong>
                          <small>{outletNameMap.get(item.outletId) ?? "Kitchen"}</small>
                        </span>
                        <b>{formatNaira(item.currentPriceMinor ?? item.priceMinor)}</b>
                      </Link>
                    ))
                  )}

                  <Link href="/menu" className="landing-search-dropdown__footer">
                    Open full menu search
                  </Link>
                </div>
              ) : null}
            </div>

            <Link href="/outlets" className="landing-browse-button">
              <Button fullWidth>Browse Outlets</Button>
            </Link>
          </div>
        </div>
      </section>

      <section className="landing-section" id="outlets" aria-labelledby="landing-outlets-title">
        <div className="landing-section__header">
          <div>
            <p className="landing-eyebrow">Our outlets</p>
          </div>
          <Link href="/outlets">View all</Link>
        </div>

        {outletsQuery.isPending ? (
          <div className="landing-outlet-grid" aria-label="Loading outlets">
            {[1, 2, 3, 4].map((item) => (
              <div key={item} className="landing-card-skeleton" />
            ))}
          </div>
        ) : outletsQuery.isError || featuredOutlets.length === 0 ? (
          <p className="landing-empty">
            No outlets are available right now. Please try again soon.
          </p>
        ) : (
          <div className="landing-outlet-grid">
            {featuredOutlets.map((outlet) => (
              <Link
                key={outlet.id}
                href={outlet.isOnline === false ? "/outlets" : `/outlets/${outlet.id}`}
                className="landing-outlet-card"
                aria-disabled={outlet.isOnline === false}
              >
                <span
                  className="landing-outlet-card__status"
                  data-online={outlet.isOnline !== false}
                />
                <span className="landing-outlet-card__image">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={outlet.image} alt="" aria-hidden="true" />
                </span>
                <strong>{outlet.name}</strong>
                <small>{outlet.cuisines.join(" · ")}</small>
                <span>
                  <StarIcon aria-hidden="true" /> {formatOutletRating(outlet.rating)} ·{" "}
                  {outlet.deliveryTime ?? "30-45"} mins
                </span>
              </Link>
            ))}
          </div>
        )}
      </section>

      <section className="landing-section" id="specials" aria-labelledby="landing-specials-title">
        <div className="landing-section__header">
          <div>
            <p className="landing-eyebrow">Popular picks today</p>
          </div>
        </div>

        {specials.length === 0 ? (
          <p className="landing-empty">
            Menu specials will appear here once kitchens publish them.
          </p>
        ) : (
          <div className="landing-special-grid">
            {specials.map((item) => (
              <Link
                key={item.id}
                href={`/menu/${item.id}`}
                className="landing-special-card"
                aria-label={`View ${item.name}`}
              >
                <span className="landing-special-card__image">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={item.imageUrl ?? "/images/images/fire_1f525.png"}
                    alt=""
                    aria-hidden="true"
                  />
                </span>
                <span className="landing-special-card__body">
                  <strong>{item.name}</strong>
                  <small>{item.outletName}</small>
                  <b>{formatNaira(item.currentPriceMinor ?? item.priceMinor)}</b>
                </span>
              </Link>
            ))}
          </div>
        )}
      </section>

      <section
        className="landing-section landing-discounts"
        aria-labelledby="landing-discounts-title"
      >
        <div className="landing-section__header">
          <div>
            <p className="landing-eyebrow">Exclusive discounts</p>
            {/* <h2 id="landing-discounts-title">Save before checkout</h2> */}
          </div>
          {/* <Link href="/outlets">Explore</Link> */}
        </div>

        {promosQuery.isPending ? (
          <div className="landing-card-skeleton landing-card-skeleton--wide" />
        ) : promos.length === 0 ? (
          <p className="landing-empty">No active promos at the moment.</p>
        ) : (
          <div
            className="landing-promo-grid"
            data-slider={promos.length > 1}
            aria-label={promos.length > 1 ? "Swipe promo offers" : "Promo offer"}
          >
            {promos.map((promo) => (
              <article key={promo.id} className="landing-promo-card">
                <span>Use code {promo.code}</span>
                <h3>{promo.title}</h3>
                <p>{promo.body}</p>
                <strong>Up to {promo.discountPercent}% off</strong>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="landing-section landing-steps" id="how-it-works">
        {steps.map((step, index) => (
          <article key={step.title}>
            <span>{index + 1}</span>
            <h3>{step.title}</h3>
            <p>{step.copy}</p>
          </article>
        ))}
      </section>

      {heroPromo ? (
        <Link href="/outlets" className="landing-floating-promo">
          <span>{heroPromo.code}</span>
          <strong>{heroPromo.discountPercent}% off</strong>
        </Link>
      ) : null}
    </main>
  );
}
