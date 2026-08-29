"use client";

import type { MenuItemSummary, OutletSummary, Promo } from "@rsc/contracts";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowRightIcon,
  AwardIcon,
  CheckCircle2Icon,
  ChevronDownIcon,
  ChevronRightIcon,
  FlameIcon,
  HeartIcon,
  HelpCircleIcon,
  HomeIcon,
  MapPinIcon,
  PlusIcon,
  ReceiptIcon,
  SearchIcon,
  ShieldCheckIcon,
  ShoppingBagIcon,
  StarIcon,
  TagIcon,
  TruckIcon,
  UserIcon,
  UtensilsIcon,
  XIcon,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";

import { useMenuSearch } from "@/src/hooks/use-menu-search";
import { OUTLETS_QUERY } from "@/src/hooks/use-outlets";
import { usePromoNotifications } from "@/src/hooks/use-notifications";
import { cartItemCount, formatNaira } from "@/src/lib/data/cart";
import { formatOutletRating, toDisplayOutlet, type Outlet } from "@/src/lib/data/outlets";
import { useAuthStore } from "@/src/stores/auth-store";
import { useCartStore } from "@/src/stores/cart-store";
import { BrandLogo } from "@/src/components/shared/brand-logo";

const categoryPills = [
  { label: "Rice & Swallow", icon: "🌾", query: "Rice" },
  { label: "Suya & Grills", icon: "🔥", query: "Suya" },
  { label: "Pasta & Italian", icon: "🍝", query: "Pasta" },
  { label: "Pastries & Bakery", icon: "🥐", query: "Pastry" },
  { label: "Coolers & Drinks", icon: "🥤", query: "Drink" },
  { label: "Fast Bites", icon: "🍗", query: "Chicken" },
  { label: "Burgers & Sandwiches", icon: "🍔", query: "Burger" },
  { label: "Fresh Salads", icon: "🥗", query: "Salad" },
] as const;

const trustPillars = [
  {
    title: "TOP QUALITY",
    subtitle: "Always the best",
    icon: AwardIcon,
  },
  {
    title: "FAST DELIVERY",
    subtitle: "On time, every time",
    icon: TruckIcon,
  },
  {
    title: "SAFE & SECURE",
    subtitle: "Your safety, our priority",
    icon: ShieldCheckIcon,
  },
  {
    title: "SUPPORT LOCAL",
    subtitle: "We grow together",
    icon: HeartIcon,
  },
] as const;

const steps = [
  {
    step: "01",
    title: "Pick kitchens",
    subtitle: "Explore live outlets",
    copy: "Browse our curated network of live DineOut NG kitchens. Discover specialized menus from authentic Nigerian delicacies to artisanal continental favorites.",
    icon: UtensilsIcon,
  },
  {
    step: "02",
    title: "Build one cart",
    subtitle: "Mix & match freely",
    copy: "Add Jollof from Kitchen A and Lebanese Mezze from Kitchen B into one single cart. No split app orders or juggling separate deliveries.",
    icon: ShoppingBagIcon,
  },
  {
    step: "03",
    title: "Pay & track live",
    subtitle: "Single checkout & updates",
    copy: "Pay once securely. Watch each kitchen prepare your dishes in real-time, then track your unified dispatch right to your doorstep.",
    icon: TruckIcon,
  },
] as const;

const faqItems = [
  {
    question: "Can I really order from multiple DineOut NG kitchens in one transaction?",
    answer:
      "Yes! DineOut NG enables you to add dishes from different kitchens into a single master cart and pay once. Our dispatch coordination system manages the cooking and pickup so your complete order arrives together.",
  },
  {
    question: "How does delivery pricing work for multi-kitchen orders?",
    answer:
      "You pay a transparent delivery fee calculated for your overall trip, without having to pay full separate delivery charges for every single kitchen you order from.",
  },
  {
    question: "How do I track my order if kitchens prepare food at different speeds?",
    answer:
      "Our live order tracking screen breaks down the progress of each kitchen in real-time — from kitchen prep and cooking to driver dispatch and final delivery.",
  },
  {
    question: "What payment methods do you accept?",
    answer:
      "We accept all major debit cards, bank transfers, and digital wallets via Paystack and Moment payment gateways with instant payment confirmation.",
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
    .slice(0, 10);
}

export function LandingPage() {
  const [searchInput, setSearchInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchFocused, setSearchFocused] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [addedToast, setAddedToast] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isSignedIn = useAuthStore((s) => s.isSignedIn);
  const hasHydrated = useAuthStore((s) => s._hasHydrated);
  const cart = useCartStore((s) => s.cart);
  const addItemToCart = useCartStore((s) => s.addItem);
  const totalCartCount = cartItemCount(cart);

  const showSignIn = !hasHydrated || !isSignedIn;

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

  function handleCategoryPillClick(queryText: string) {
    setSearchInput(queryText);
    setSearchQuery(queryText);
    setSearchFocused(true);
  }

  function handleCopyPromoCode(code: string) {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      void navigator.clipboard.writeText(code);
      setCopiedCode(code);
      setTimeout(() => setCopiedCode(null), 2500);
    }
  }

  function handleQuickAddSpecial(special: MenuItemSummary & { outletName: string }) {
    addItemToCart({
      outletId: special.outletId,
      outletName: special.outletName,
      item: {
        id: special.id,
        name: special.name,
        notes: "",
        quantity: 1,
        unitPriceMinor: special.currentPriceMinor ?? special.priceMinor,
        modifiers: [],
      },
    });

    setAddedToast(`Added "${special.name}" to cart!`);
    setTimeout(() => setAddedToast(null), 2500);
  }

  return (
    <main className="grab-landing-shell">
      {/* Toast Notification for quick add */}
      {addedToast && (
        <div className="grab-toast" role="status" aria-live="polite">
          <CheckCircle2Icon className="w-4 h-4 text-emerald-400 shrink-0" />
          <span className="grab-toast__msg">{addedToast}</span>
          <Link href="/cart" className="grab-toast__link">
            View Cart ({totalCartCount}) →
          </Link>
        </div>
      )}

      {/* Top Banner Accent */}
      <div className="landing-top-banner" aria-label="Announcement">
        <span className="landing-top-banner__badge">NEW</span>
        <span>Order across multiple DineOut NG kitchens with one single checkout & delivery!</span>
        <Link href="#how-it-works" className="landing-top-banner__link">
          Learn how it works →
        </Link>
      </div>

      {/* Former Header Navigation */}
      <header className="landing-header" aria-label="RSC Foods landing navigation">
        <Link className="landing-brand" href="/" aria-label="RSC Foods home">
          <BrandLogo className="w-28 sm:w-32" priority />
        </Link>

        <nav className="landing-header__nav" aria-label="Primary navigation">
          <Link href="#outlets" className="landing-header__link">
            Kitchens
          </Link>
          <Link href="#specials" className="landing-header__link">
            Specials
          </Link>
          <Link href="#how-it-works" className="landing-header__link">
            How it Works
          </Link>
          <Link href="/cart" className="landing-header__link">
            Cart
          </Link>
        </nav>

        <div className="landing-header__actions">
          {showSignIn && (
            <Link href="/sign-in" className="landing-sign-in">
              Sign in
            </Link>
          )}
          <Link href="/outlets" className="landing-header__cta">
            Order Now
          </Link>
        </div>
      </header>

      {/* Hero Brand Identity Section */}
      <section className="grab-hero">
        <div className="grab-hero__brush-bg" aria-hidden="true" />

        <div className="grab-hero__brand-center">
          <div className="grab-hero__tagline-group">
            <h1 className="grab-hero__tagline-main">One App. Many Flavors.</h1>
            <p className="grab-hero__tagline-sub">Endless Choices.</p>
          </div>
        </div>

        {/* Grab Pill Search Input */}
        <div className="grab-search-container">
          <div className="grab-search-card" role="search">
            <SearchIcon className="grab-search-card__icon" aria-hidden="true" />
            <input
              value={searchInput}
              type="search"
              role="combobox"
              autoComplete="off"
              placeholder="Search for food, cuisines or restaurants"
              aria-label="Search for food, cuisines or restaurants"
              aria-expanded={showSearchDropdown}
              aria-controls="grab-search-results"
              aria-autocomplete="list"
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setTimeout(() => setSearchFocused(false), 200)}
              onChange={(event) => handleSearchInput(event.target.value)}
            />

            {searchInput.length > 0 && (
              <button
                type="button"
                className="grab-search-card__clear"
                onClick={() => {
                  setSearchInput("");
                  setSearchQuery("");
                }}
                aria-label="Clear search"
              >
                <XIcon className="w-4 h-4" />
              </button>
            )}

            {/* Live Search Autocomplete Dropdown */}
            {showSearchDropdown ? (
              <div
                id="grab-search-results"
                className="grab-search-dropdown"
                role="listbox"
                aria-label="Menu search results"
              >
                {searchInput.trim().length < 2 ? (
                  <p className="grab-search-dropdown__prompt">
                    Type at least 2 characters to search menu items.
                  </p>
                ) : menuSearch.isPending || menuSearch.isFetching ? (
                  <div className="grab-search-dropdown__loading">
                    <span className="grab-skeleton grab-skeleton--item" />
                    <span className="grab-skeleton grab-skeleton--item" />
                  </div>
                ) : searchResults.length === 0 ? (
                  <p className="grab-search-dropdown__empty">
                    No menu items found for &quot;{searchInput}&quot;. Try searching for Jollof,
                    Pasta, Suya, or Burger.
                  </p>
                ) : (
                  searchResults.map((item) => (
                    <Link
                      key={item.id}
                      href={`/menu/${item.id}`}
                      className="grab-search-result-row"
                      role="option"
                    >
                      <span className="grab-search-result-row__thumb">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={item.imageUrl ?? "/images/images/fire_1f525.png"}
                          alt=""
                          aria-hidden="true"
                        />
                      </span>
                      <span className="grab-search-result-row__details">
                        <strong>{item.name}</strong>
                        <small>{outletNameMap.get(item.outletId) ?? "DineOut Kitchen"}</small>
                      </span>
                      <b className="grab-search-result-row__price">
                        {formatNaira(item.currentPriceMinor ?? item.priceMinor)}
                      </b>
                    </Link>
                  ))
                )}

                <Link href="/outlets" className="grab-search-dropdown__footer">
                  <span>Explore all kitchen menus</span>
                  <ArrowRightIcon className="w-4 h-4" />
                </Link>
              </div>
            ) : null}
          </div>
        </div>

        {/* Category Pills Bar */}
        <div className="grab-category-scroll" aria-label="Popular food categories">
          {categoryPills.map((pill) => (
            <button
              key={pill.label}
              type="button"
              className="grab-category-chip"
              onClick={() => handleCategoryPillClick(pill.query)}
            >
              <span className="grab-category-chip__icon">{pill.icon}</span>
              <span className="grab-category-chip__label">{pill.label}</span>
            </button>
          ))}
        </div>
      </section>

      {/* ── SECTION 1: OUR OUTLETS (Portrait Cards with Full Image & Order Now CTA) ── */}
      <section className="grab-section" id="outlets" aria-labelledby="grab-outlets-heading">
        <div className="grab-section__header">
          <h2 id="grab-outlets-heading" className="grab-section__title">
            OUR OUTLETS
          </h2>
          <Link href="/outlets" className="grab-section__view-all">
            <span>View All</span>
            <ChevronRightIcon className="w-4 h-4" />
          </Link>
        </div>

        {outletsQuery.isPending ? (
          <div className="grab-outlets-portrait-grid">
            {[1, 2, 3, 4].map((n) => (
              <div key={n} className="grab-portrait-card grab-skeleton" />
            ))}
          </div>
        ) : outletsQuery.isError || featuredOutlets.length === 0 ? (
          <div className="grab-empty">
            <UtensilsIcon className="w-8 h-8 text-emerald-500 mb-2" />
            <p>No outlets are available right now. Please check back soon.</p>
          </div>
        ) : (
          <div className="grab-outlets-portrait-grid">
            {featuredOutlets.map((outlet, idx) => {
              const isOffline = outlet.isOnline === false;
              const hasImageUrl =
                outlet.image && (outlet.image.startsWith("/") || outlet.image.startsWith("http"));

              return (
                <article
                  key={outlet.id}
                  className="grab-portrait-card"
                  data-disabled={isOffline}
                  style={{
                    backgroundColor: outlet.headerColor || "#0d1a12",
                    ...(hasImageUrl
                      ? {
                          backgroundImage: `linear-gradient(180deg, rgba(6, 16, 10, 0.82) 0%, rgba(6, 16, 10, 0.25) 45%, rgba(6, 16, 10, 0.88) 100%), url(${outlet.image})`,
                          backgroundSize: "cover",
                          backgroundPosition: "center",
                        }
                      : {}),
                  }}
                >
                  {/* Card Brand Header */}
                  <div className="grab-portrait-card__header">
                    <div className="grab-portrait-card__top-meta">
                      <span
                        className="grab-portrait-card__status"
                        data-online={outlet.isOnline !== false}
                      >
                        <span className="grab-portrait-card__status-dot" />
                        {outlet.isOnline !== false ? "Open" : "Closed"}
                      </span>
                      <span className="grab-portrait-card__rating">
                        <StarIcon className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                        {formatOutletRating(outlet.rating)}
                      </span>
                    </div>

                    <h3 className="grab-portrait-card__title">{outlet.name}</h3>
                    <p className="grab-portrait-card__subtitle">
                      {outlet.cuisines?.length > 0
                        ? outlet.cuisines.join(" · ")
                        : "Wholesome Flavors"}
                    </p>
                  </div>

                  {/* Non-URL Emoji / Fallback Graphic in Body if no image URL */}
                  {!hasImageUrl && (
                    <div className="grab-portrait-card__body-fallback">
                      <span className="text-6xl">{outlet.image || "🍲"}</span>
                    </div>
                  )}

                  {/* Spacer to push CTA cleanly to the bottom */}
                  <div className="grab-portrait-card__spacer" />

                  {/* ORDER NOW CTA Pill Button */}
                  <div className="grab-portrait-card__footer">
                    <Link
                      href={isOffline ? "#" : `/outlets/${outlet.id}`}
                      className={`grab-order-now-btn ${idx === 2 ? "grab-order-now-btn--amber" : ""}`}
                      aria-label={`Order now from ${outlet.name}`}
                    >
                      <span className="grab-order-now-btn__text">
                        {isOffline ? "CLOSED" : "ORDER NOW"}
                      </span>
                      <span className="grab-order-now-btn__circle">
                        <ChevronRightIcon className="w-4 h-4" />
                      </span>
                    </Link>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      {/* ── SECTION 2: POPULAR MENUS (Portrait & Scrollable, no Today's Pick badge) ── */}
      <section className="grab-section" id="menus" aria-labelledby="grab-menus-heading">
        <div className="grab-section__header">
          <div className="flex items-center gap-1.5">
            <span className="text-xl" role="img" aria-label="Plate">
              🍽️
            </span>
            <h2 id="grab-menus-heading" className="grab-section__title">
              POPULAR MENUS
            </h2>
          </div>
          <Link href="/menu" className="grab-section__view-all">
            <span>View All</span>
            <ChevronRightIcon className="w-4 h-4" />
          </Link>
        </div>

        {specials.length === 0 ? (
          <div className="grab-empty">
            <UtensilsIcon className="w-8 h-8 text-emerald-500 mb-2" />
            <p>Menu items will appear here once kitchens publish them.</p>
          </div>
        ) : (
          <div className="grab-menus-scroll">
            {specials.map((special) => (
              <div key={special.id} className="grab-menu-portrait-card">
                {/* Food Photo with Floating Quick Add + button */}
                <div className="grab-menu-portrait-card__image-wrap">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={special.imageUrl ?? "/images/images/fire_1f525.png"}
                    alt={special.name}
                    className="grab-menu-portrait-card__image"
                    loading="lazy"
                  />
                  <button
                    type="button"
                    className="grab-menu-portrait-card__add-btn"
                    aria-label={`Add ${special.name} to cart`}
                    onClick={() => handleQuickAddSpecial(special)}
                  >
                    <PlusIcon className="w-4 h-4 text-white" />
                  </button>
                </div>

                {/* Card Body */}
                <div className="grab-menu-portrait-card__body">
                  <h3 className="grab-menu-portrait-card__title" title={special.name}>
                    {special.name}
                  </h3>
                  <p className="grab-menu-portrait-card__outlet">{special.outletName}</p>

                  <div className="grab-menu-portrait-card__price-row">
                    <span className="grab-menu-portrait-card__price">
                      {formatNaira(special.currentPriceMinor ?? special.priceMinor)}
                    </span>
                    {special.isDiscountActive && (
                      <span className="grab-menu-portrait-card__strike-price">
                        {formatNaira(special.priceMinor)}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ── SECTION 3: DAILY SPECIALS (Scrollable promos from backend) ── */}
      <section className="grab-section" id="specials" aria-labelledby="grab-specials-heading">
        <div className="grab-section__header">
          <div className="flex items-center gap-1.5">
            <span className="text-xl" role="img" aria-label="Fire">
              🔥
            </span>
            <h2 id="grab-specials-heading" className="grab-section__title">
              DAILY SPECIALS
            </h2>
          </div>
        </div>

        {promos.length === 0 ? (
          <div className="grab-promo-banner">
            <div className="grab-promo-banner__content">
              <div className="grab-promo-banner__title-lockup">
                <span className="grab-promo-banner__heading-white">HUNGRY FOR</span>
                <span className="grab-promo-banner__heading-green">MORE?</span>
              </div>
              <p className="grab-promo-banner__copy">
                Check back soon for fresh daily specials and exclusive kitchen discounts!
              </p>
            </div>
            <div className="grab-promo-banner__graphic">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=600&auto=format&fit=crop&q=80"
                alt="Delicious DineOut specials"
                className="grab-promo-banner__food-img"
                loading="lazy"
              />
            </div>
          </div>
        ) : (
          <div className="grab-promos-scroll">
            {promos.map((promo) => (
              <div key={promo.id} className="grab-promo-card">
                <div className="grab-promo-card__image-wrap">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={
                      promo.imageUrl ||
                      "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=600&auto=format&fit=crop&q=80"
                    }
                    alt={promo.title}
                    className="grab-promo-card__image"
                    loading="lazy"
                  />
                  <div className="grab-promo-card__badge">
                    <span>{promo.discountPercent}% OFF</span>
                  </div>
                </div>

                <div className="grab-promo-card__body">
                  <span className="grab-promo-card__scope-tag">
                    {promo.scope === "OUTLET" && promo.outletId
                      ? (outletNameMap.get(promo.outletId) ?? "Outlet Exclusive")
                      : "All Outlets"}
                  </span>
                  <h3 className="grab-promo-card__title">{promo.title}</h3>
                  <p className="grab-promo-card__desc">{promo.body}</p>

                  <button
                    type="button"
                    className="grab-promo-card__code-btn"
                    onClick={() => handleCopyPromoCode(promo.code)}
                    title="Click to copy promo code"
                  >
                    <span className="flex items-center gap-1.5">
                      <TagIcon className="w-3.5 h-3.5 text-amber-300" />
                      <span>
                        CODE: <strong>{promo.code}</strong>
                      </span>
                    </span>
                    <span className="grab-promo-card__copy-tag">
                      {copiedCode === promo.code ? "COPIED!" : "COPY"}
                    </span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ── SECTION 4: 4-PILLAR TRUST & BENEFIT GRID ── */}
      <section className="grab-trust-section" aria-label="Why choose DineOut NG">
        <div className="grab-trust-grid">
          {trustPillars.map((item) => {
            const IconComp = item.icon;
            return (
              <div key={item.title} className="grab-trust-pillar">
                <div className="grab-trust-pillar__icon-circle">
                  <IconComp className="w-5 h-5 text-emerald-400" />
                </div>
                <h3 className="grab-trust-pillar__title">{item.title}</h3>
                <p className="grab-trust-pillar__subtitle">{item.subtitle}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* ── SECTION 5: HOW ONE DINEOUT ORDER WORKS (3 STEPS) ── */}
      <section className="grab-section" id="how-it-works" aria-labelledby="grab-how-heading">
        <div className="grab-steps-wrapper">
          <div className="grab-steps-header">
            <span className="grab-section-eyebrow">SIMPLE 3-STEP PROCESS</span>
            <h2 id="grab-how-heading" className="grab-steps-title">
              How one DineOut NG order works
            </h2>
            <p className="grab-steps-desc">
              Ordering from multiple kitchens used to mean multiple delivery fees and separate app
              checkouts. DineOut NG simplifies everything into 3 steps.
            </p>
          </div>

          <div className="grab-steps-grid">
            {steps.map((step) => {
              const IconComp = step.icon;
              return (
                <article key={step.title} className="grab-step-card">
                  <div className="grab-step-card__top">
                    <span className="grab-step-card__num">{step.step}</span>
                    <div className="grab-step-card__icon-box">
                      <IconComp className="w-5 h-5" />
                    </div>
                  </div>
                  <span className="grab-step-card__sub">{step.subtitle}</span>
                  <h3 className="grab-step-card__title">{step.title}</h3>
                  <p className="grab-step-card__copy">{step.copy}</p>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── SECTION 6: FAQ ACCORDION ── */}
      <section className="grab-section" id="faq" aria-labelledby="grab-faq-heading">
        <div className="grab-section__header">
          <div>
            <span className="grab-section-eyebrow">GOT QUESTIONS?</span>
            <h2 id="grab-faq-heading" className="grab-section__title">
              Frequently asked questions
            </h2>
          </div>
        </div>

        <div className="grab-faq-list">
          {faqItems.map((item, idx) => {
            const isOpen = openFaq === idx;
            return (
              <div key={item.question} className="grab-faq-item" data-open={isOpen}>
                <button
                  type="button"
                  className="grab-faq-question"
                  onClick={() => setOpenFaq(isOpen ? null : idx)}
                  aria-expanded={isOpen}
                >
                  <span className="flex items-center gap-2.5">
                    <HelpCircleIcon className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>{item.question}</span>
                  </span>
                  <ChevronDownIcon
                    className={`w-5 h-5 transition-transform duration-200 ${
                      isOpen ? "rotate-180 text-emerald-400" : "text-gray-400"
                    }`}
                  />
                </button>
                {isOpen && (
                  <div className="grab-faq-answer">
                    <p>{item.answer}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="grab-footer" aria-label="Footer navigation">
        <div className="grab-footer__inner">
          <div className="grab-footer__brand-col">
            <BrandLogo className="w-32" priority />
            <p className="grab-footer__tagline">
              One app. Many flavors. Endless choices. The smartest way to order food across
              specialized DineOut NG kitchens in Nigeria.
            </p>
            <p className="grab-footer__copy">
              © {new Date().getFullYear()} DineOut Group Ltd. All rights reserved.
            </p>
          </div>

          <div className="grab-footer__links-col">
            <h4>Quick Links</h4>
            <ul>
              <li>
                <Link href="/outlets">All Kitchens</Link>
              </li>
              <li>
                <Link href="#specials">Daily Specials</Link>
              </li>
              <li>
                <Link href="/cart">Your Cart</Link>
              </li>
              <li>
                <Link href="/sign-in">Customer Sign In</Link>
              </li>
            </ul>
          </div>

          <div className="grab-footer__links-col">
            <h4>Kitchen Network</h4>
            <ul>
              <li>
                <Link href="/outlets">Lagos Outlets</Link>
              </li>
              <li>
                <Link href="/outlets">Abuja Outlets</Link>
              </li>
              <li>
                <Link href="/outlets">Port Harcourt Hubs</Link>
              </li>
              <li>
                <Link href="/outlets">Ibadan Kitchens</Link>
              </li>
            </ul>
          </div>

          <div className="grab-footer__links-col">
            <h4>Trust & Legal</h4>
            <ul>
              <li>
                <Link href="#how-it-works">How It Works</Link>
              </li>
              <li>
                <Link href="#faq">FAQs & Support</Link>
              </li>
              <li>
                <span className="text-gray-400 text-sm">Privacy & Terms</span>
              </li>
              <li>
                <span className="text-gray-400 text-sm">DineOut NG Partner Outlets</span>
              </li>
            </ul>
          </div>
        </div>
      </footer>

      {/* ── MOBILE STICKY BOTTOM NAVIGATION BAR ── */}
      <nav className="grab-bottom-nav" aria-label="Mobile bottom navigation">
        <Link href="/" className="grab-bottom-nav__item grab-bottom-nav__item--active">
          <HomeIcon className="w-5 h-5" />
          <span>Home</span>
        </Link>
        <Link href="/orders" className="grab-bottom-nav__item">
          <ReceiptIcon className="w-5 h-5" />
          <span>Orders</span>
        </Link>
        <Link
          href="/cart"
          className="grab-bottom-nav__item grab-bottom-nav__item--center-cart"
          aria-label="View Cart"
        >
          <div className="grab-bottom-nav__cart-circle">
            <ShoppingBagIcon className="w-5 h-5 text-white" />
            {totalCartCount > 0 && (
              <span className="grab-bottom-nav__cart-badge">{totalCartCount}</span>
            )}
          </div>
          <span>Cart</span>
        </Link>
        <Link href="/outlets" className="grab-bottom-nav__item">
          <HeartIcon className="w-5 h-5" />
          <span>Favourites</span>
        </Link>
        <Link href={isSignedIn ? "/profile" : "/sign-in"} className="grab-bottom-nav__item">
          <UserIcon className="w-5 h-5" />
          <span>Account</span>
        </Link>
      </nav>
    </main>
  );
}
