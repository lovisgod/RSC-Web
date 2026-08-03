"use client";

import type { MenuItemSummary, OutletSummary, Promo } from "@rsc/contracts";
import { Button } from "@rsc/ui";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowRightIcon,
  CheckCircle2Icon,
  ChevronDownIcon,
  ClockIcon,
  CreditCardIcon,
  FlameIcon,
  HelpCircleIcon,
  SearchIcon,
  ShieldCheckIcon,
  ShoppingBagIcon,
  SparklesIcon,
  StarIcon,
  TagIcon,
  TruckIcon,
  UtensilsIcon,
  XIcon,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";

import { useMenuSearch } from "@/src/hooks/use-menu-search";
import { OUTLETS_QUERY } from "@/src/hooks/use-outlets";
import { usePromoNotifications } from "@/src/hooks/use-notifications";
import { formatNaira } from "@/src/lib/data/cart";
import { formatOutletRating, toDisplayOutlet } from "@/src/lib/data/outlets";
import { useAuthStore } from "@/src/stores/auth-store";
import { BrandLogo } from "@/src/components/shared/brand-logo";

const steps = [
  {
    step: "01",
    title: "Pick kitchens",
    subtitle: "Explore live outlets",
    copy: "Browse our network of live RSC kitchens. Discover specialized menus from authentic Nigerian local dishes to gourmet bites.",
    icon: UtensilsIcon,
  },
  {
    step: "02",
    title: "Build one cart",
    subtitle: "Mix & match freely",
    copy: "Add Jollof from Kitchen A and Grilled Fish from Kitchen B into one master cart. No juggling multiple orders or app switches.",
    icon: ShoppingBagIcon,
  },
  {
    step: "03",
    title: "Pay & track live",
    subtitle: "Single checkout & updates",
    copy: "Pay once securely. Watch every kitchen prepare your dishes in real-time, then track your order right to your doorstep.",
    icon: TruckIcon,
  },
] as const;

const trustHighlights = [
  {
    title: "Multi-Kitchen Cart",
    copy: "Combine meals from 3+ kitchens into one order.",
    icon: ShoppingBagIcon,
  },
  {
    title: "Single Checkout",
    copy: "One payment, zero split fees, total peace of mind.",
    icon: CreditCardIcon,
  },
  {
    title: "Live Tracker",
    copy: "Follow kitchen prep and driver dispatch live.",
    icon: ClockIcon,
  },
  {
    title: "Guaranteed Fresh",
    copy: "Cooked to order by expert RSC culinary teams.",
    icon: ShieldCheckIcon,
  },
] as const;

const categoryPills = [
  { label: "Rice & Swallow", icon: "🌾", query: "Rice" },
  { label: "Suya & Grills", icon: "🔥", query: "Suya" },
  { label: "Pastries & Bakery", icon: "🥐", query: "Pastry" },
  { label: "Coolers & Drinks", icon: "🥤", query: "Drink" },
  { label: "Fast Bites", icon: "🍗", query: "Chicken" },
] as const;

const faqItems = [
  {
    question: "Can I really order from multiple RSC kitchens in one transaction?",
    answer:
      "Yes! RSC Foods allows you to add items from different kitchens into a single cart and check out once. Our smart dispatch system coordinates preparation so everything arrives together.",
  },
  {
    question: "How does delivery pricing work for multi-kitchen orders?",
    answer:
      "You pay a transparent delivery fee calculated for your overall trip, without having to pay full separate delivery charges for every kitchen you order from.",
  },
  {
    question: "How do I track my order if kitchens prepare food at different speeds?",
    answer:
      "Our live order tracking screen breaks down the progress of each kitchen in real-time — from preparation and packaging to pickup and final delivery.",
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
    .slice(0, 4);
}

export function LandingPage() {
  const [searchInput, setSearchInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchFocused, setSearchFocused] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isSignedIn = useAuthStore((s) => s.isSignedIn);
  const hasHydrated = useAuthStore((s) => s._hasHydrated);

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
  const onlineOutletsCount = outlets.filter((o) => o.isOnline !== false).length;

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

  return (
    <main className="landing-shell">
      {/* Top Banner Accent */}
      <div className="landing-top-banner" aria-label="Announcement">
        <span className="landing-top-banner__badge">NEW</span>
        <span>Order across multiple RSC kitchens with one single checkout & delivery!</span>
        <Link href="#how-it-works" className="landing-top-banner__link">
          Learn how it works →
        </Link>
      </div>

      {/* Header Navigation */}
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

      {/* Hero Section */}
      <section className="landing-hero">
        <div className="landing-hero__content">
          <div className="landing-hero__pill">
            <span className="landing-hero__pill-dot" />
            <SparklesIcon className="w-4 h-4 text-emerald-600" />
            <span>Multi-Kitchen Food Platform</span>
          </div>

          <h1>
            Dine across <span className="landing-hero__highlight">RSC kitchens</span> in one clean
            order.
          </h1>

          <p className="landing-hero__description">
            Craving Jollof from Kitchen A and Suya from Kitchen B? Combine dishes from any RSC
            outlet into one cart, pay once, and track your feast in real time.
          </p>

          {/* Search Box & Dropdown */}
          <div className="landing-search-wrapper">
            <div className="landing-search-card" role="search">
              <SearchIcon className="landing-search-card__icon" aria-hidden="true" />
              <input
                value={searchInput}
                type="search"
                role="combobox"
                autoComplete="off"
                placeholder="Search food, cuisines, or kitchens..."
                aria-label="Search food, cuisines, or kitchens"
                aria-expanded={showSearchDropdown}
                aria-controls="landing-search-results"
                aria-autocomplete="list"
                onFocus={() => setSearchFocused(true)}
                onBlur={() => setTimeout(() => setSearchFocused(false), 200)}
                onChange={(event) => handleSearchInput(event.target.value)}
              />

              {searchInput.length > 0 && (
                <button
                  type="button"
                  className="landing-search-card__clear"
                  onClick={() => {
                    setSearchInput("");
                    setSearchQuery("");
                  }}
                  aria-label="Clear search"
                >
                  <XIcon className="w-4 h-4" />
                </button>
              )}

              {showSearchDropdown ? (
                <div
                  id="landing-search-results"
                  className="landing-search-dropdown"
                  role="listbox"
                  aria-label="Menu search results"
                >
                  {searchInput.trim().length < 2 ? (
                    <p className="landing-search-dropdown__prompt">
                      Type at least 2 characters to search menu items.
                    </p>
                  ) : menuSearch.isPending || menuSearch.isFetching ? (
                    <div className="landing-search-dropdown__loading">
                      <span className="landing-search-dropdown__skeleton" />
                      <span className="landing-search-dropdown__skeleton" />
                      <span className="landing-search-dropdown__skeleton" />
                    </div>
                  ) : searchResults.length === 0 ? (
                    <p className="landing-search-dropdown__empty">
                      No menu items found for &quot;{searchInput}&quot;. Try searching for Jollof,
                      Rice, Suya, or Drinks.
                    </p>
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
                        <span className="landing-search-result__info">
                          <strong>{item.name}</strong>
                          <small>{outletNameMap.get(item.outletId) ?? "RSC Kitchen"}</small>
                        </span>
                        <b className="landing-search-result__price">
                          {formatNaira(item.currentPriceMinor ?? item.priceMinor)}
                        </b>
                      </Link>
                    ))
                  )}

                  <Link href="/outlets" className="landing-search-dropdown__footer">
                    <span>Explore all kitchen menus</span>
                    <ArrowRightIcon className="w-4 h-4" />
                  </Link>
                </div>
              ) : null}
            </div>

            <Link href="/outlets" className="landing-browse-button">
              <Button fullWidth className="landing-browse-btn">
                Browse Outlets
              </Button>
            </Link>
          </div>

          {/* Quick Category Pills */}
          <div className="landing-category-pills" aria-label="Popular cuisines">
            <span className="landing-category-pills__label">Popular:</span>
            {categoryPills.map((pill) => (
              <button
                key={pill.label}
                type="button"
                className="landing-category-pill"
                onClick={() => handleCategoryPillClick(pill.query)}
              >
                <span>{pill.icon}</span>
                <span>{pill.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Hero Visual Composition */}
        <div className="landing-hero__visual-container">
          <div className="landing-hero__visual" aria-label="Food order preview">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/assets/cart.png" alt="RSC Foods Multi-Kitchen Cart" />
            <div className="landing-hero__overlay" />

            {/* Floating Live Badge */}
            <div className="landing-hero__badge landing-hero__badge--top">
              <div className="landing-hero__badge-pulse" />
              <div>
                <span>{onlineOutletsCount || outlets.length || "4"}</span>
                <small>live kitchens online</small>
              </div>
            </div>

            {/* Floating Single Checkout Card */}
            <div className="landing-hero__badge landing-hero__badge--bottom">
              <CheckCircle2Icon className="w-5 h-5 text-emerald-400" />
              <div>
                <strong>One Checkout</strong>
                <small>Pay once for all kitchens</small>
              </div>
            </div>

            {/* Rating Tag */}
            <div className="landing-hero__badge landing-hero__badge--rating">
              <StarIcon className="w-4 h-4 text-amber-400 fill-amber-400" />
              <span>4.9 / 5</span>
              <small>(10k+ Orders)</small>
            </div>
          </div>
        </div>
      </section>

      {/* Trust & Benefit Highlights Strip */}
      <section className="landing-trust-strip" aria-label="Platform advantages">
        {trustHighlights.map((item) => {
          const IconComponent = item.icon;
          return (
            <div key={item.title} className="landing-trust-item">
              <div className="landing-trust-item__icon">
                <IconComponent className="w-5 h-5" />
              </div>
              <div className="landing-trust-item__text">
                <h3>{item.title}</h3>
                <p>{item.copy}</p>
              </div>
            </div>
          );
        })}
      </section>

      {/* Outlets Discovery Section */}
      <section className="landing-section" id="outlets" aria-labelledby="landing-outlets-title">
        <div className="landing-section__header">
          <div>
            <span className="landing-eyebrow">OUR KITCHEN NETWORK</span>
            <h2 id="landing-outlets-title">Live kitchens near you</h2>
          </div>
          <Link href="/outlets" className="landing-section__link">
            <span>View all kitchens</span>
            <ArrowRightIcon className="w-4 h-4" />
          </Link>
        </div>

        {outletsQuery.isPending ? (
          <div className="landing-outlet-grid" aria-label="Loading outlets">
            {[1, 2, 3, 4].map((item) => (
              <div key={item} className="landing-card-skeleton" />
            ))}
          </div>
        ) : outletsQuery.isError || featuredOutlets.length === 0 ? (
          <div className="landing-empty">
            <UtensilsIcon className="w-8 h-8 text-emerald-600 mb-2" />
            <p>No outlets are available right now. Please try again soon.</p>
          </div>
        ) : (
          <div className="landing-outlet-grid">
            {featuredOutlets.map((outlet) => (
              <Link
                key={outlet.id}
                href={outlet.isOnline === false ? "/outlets" : `/outlets/${outlet.id}`}
                className="landing-outlet-card"
                aria-disabled={outlet.isOnline === false}
              >
                <div className="landing-outlet-card__image-wrap">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={outlet.image} alt={outlet.name} />
                  <span
                    className="landing-outlet-card__status"
                    data-online={outlet.isOnline !== false}
                  >
                    <span className="landing-outlet-card__status-dot" />
                    {outlet.isOnline !== false ? "Open" : "Closed"}
                  </span>
                  <span className="landing-outlet-card__rating">
                    <StarIcon className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                    {formatOutletRating(outlet.rating)}
                  </span>
                </div>

                <div className="landing-outlet-card__content">
                  <h3 className="landing-outlet-card__name">{outlet.name}</h3>
                  <p className="landing-outlet-card__cuisines">{outlet.cuisines.join(" · ")}</p>

                  <div className="landing-outlet-card__meta">
                    <span className="landing-outlet-card__time">
                      <ClockIcon className="w-3.5 h-3.5" />
                      {outlet.deliveryTime ?? "30-45"} mins
                    </span>
                    <span className="landing-outlet-card__cta">
                      Explore Menu <ArrowRightIcon className="w-3.5 h-3.5" />
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* Popular Menu Specials Section */}
      <section className="landing-section" id="specials" aria-labelledby="landing-specials-title">
        <div className="landing-section__header">
          <div>
            <span className="landing-eyebrow">HANDPICKED DELICIES</span>
            <h2 id="landing-specials-title">Popular picks today</h2>
          </div>
          <Link href="/outlets" className="landing-section__link">
            <span>Full menu search</span>
            <ArrowRightIcon className="w-4 h-4" />
          </Link>
        </div>

        {specials.length === 0 ? (
          <div className="landing-empty">
            <FlameIcon className="w-8 h-8 text-amber-500 mb-2" />
            <p>Menu specials will appear here once kitchens publish them.</p>
          </div>
        ) : (
          <div className="landing-special-grid">
            {specials.map((item) => (
              <Link
                key={item.id}
                href={`/menu/${item.id}`}
                className="landing-special-card"
                aria-label={`View ${item.name}`}
              >
                <div className="landing-special-card__image-wrap">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={item.imageUrl ?? "/images/images/fire_1f525.png"} alt={item.name} />
                  {item.isDiscountActive && (
                    <span className="landing-special-card__discount-tag">
                      <TagIcon className="w-3 h-3" /> Special Offer
                    </span>
                  )}
                </div>
                <div className="landing-special-card__body">
                  <span className="landing-special-card__outlet">{item.outletName}</span>
                  <h3 className="landing-special-card__title">{item.name}</h3>
                  <div className="landing-special-card__footer">
                    <b className="landing-special-card__price">
                      {formatNaira(item.currentPriceMinor ?? item.priceMinor)}
                    </b>
                    <span className="landing-special-card__add-btn">View Item</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* How One RSC Order Works (3 Steps) */}
      <section
        className="landing-section landing-steps-section"
        id="how-it-works"
        aria-labelledby="landing-steps-title"
      >
        <div className="landing-steps-section__header">
          <span className="landing-eyebrow">SIMPLE 3-STEP PROCESS</span>
          <h2 id="landing-steps-title">How one RSC order works</h2>
          <p>
            Ordering from multiple kitchens used to mean multiple delivery fees and separate app
            checkouts. RSC Foods simplifies everything into 3 steps.
          </p>
        </div>

        <div className="landing-steps-grid">
          {steps.map((step) => {
            const IconComp = step.icon;
            return (
              <article key={step.title} className="landing-step-card">
                <div className="landing-step-card__top">
                  <span className="landing-step-card__number">{step.step}</span>
                  <div className="landing-step-card__icon">
                    <IconComp className="w-6 h-6" />
                  </div>
                </div>
                <span className="landing-step-card__subtitle">{step.subtitle}</span>
                <h3 className="landing-step-card__title">{step.title}</h3>
                <p className="landing-step-card__copy">{step.copy}</p>
              </article>
            );
          })}
        </div>
      </section>

      {/* Promos & Discounts Section */}
      <section
        className="landing-section landing-discounts-section"
        aria-labelledby="landing-discounts-title"
      >
        <div className="landing-section__header">
          <div>
            <span className="landing-eyebrow">DEALS & SAVINGS</span>
            <h2 id="landing-discounts-title">Exclusive promos for your feast</h2>
          </div>
        </div>

        {promosQuery.isPending ? (
          <div className="landing-card-skeleton landing-card-skeleton--wide" />
        ) : promos.length === 0 ? (
          <div className="landing-empty">
            <TagIcon className="w-8 h-8 text-emerald-600 mb-2" />
            <p>No active promos at the moment. Check back soon for fresh discounts!</p>
          </div>
        ) : (
          <div
            className="landing-promo-grid"
            data-slider={promos.length > 1}
            aria-label={promos.length > 1 ? "Swipe promo offers" : "Promo offer"}
          >
            {promos.map((promo) => (
              <article key={promo.id} className="landing-promo-card">
                <div className="landing-promo-card__header">
                  <span className="landing-promo-card__code">
                    <TagIcon className="w-3.5 h-3.5" /> CODE: {promo.code}
                  </span>
                  <span className="landing-promo-card__badge">
                    Up to {promo.discountPercent}% OFF
                  </span>
                </div>
                <h3>{promo.title}</h3>
                <p>{promo.body}</p>
                <Link href="/outlets" className="landing-promo-card__cta">
                  <span>Apply at checkout</span>
                  <ArrowRightIcon className="w-4 h-4" />
                </Link>
              </article>
            ))}
          </div>
        )}
      </section>

      {/* RSC Narrative / Ecosystem Section */}
      <section className="landing-section landing-narrative-section">
        <div className="landing-narrative-card">
          <div className="landing-narrative-card__content">
            <span className="landing-eyebrow">BUILT FOR REAL FOODIES</span>
            <h2>Cooked fresh at specialized RSC kitchens. Delivered as one.</h2>
            <p>
              Whether it&apos;s a quick lunch at your desk or a weekend feast with family, RSC Foods
              brings together the finest kitchens under one umbrella. Enjoy total freedom of choice
              without the hassle of separate checkouts.
            </p>
            <div className="landing-narrative-card__actions">
              <Link href="/outlets" className="landing-narrative-btn">
                <span>Start Your Order</span>
                <ArrowRightIcon className="w-4 h-4" />
              </Link>
              <Link href="#how-it-works" className="landing-narrative-link">
                See How It Works
              </Link>
            </div>
          </div>
          <div className="landing-narrative-card__graphic">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/assets/cart-branded.png" alt="RSC Foods Experience" />
          </div>
        </div>
      </section>

      {/* FAQ Accordion Section */}
      <section className="landing-section landing-faq-section" aria-labelledby="landing-faq-title">
        <div className="landing-section__header">
          <div>
            <span className="landing-eyebrow">GOT QUESTIONS?</span>
            <h2 id="landing-faq-title">Frequently asked questions</h2>
          </div>
        </div>

        <div className="landing-faq-accordion">
          {faqItems.map((item, idx) => {
            const isOpen = openFaq === idx;
            return (
              <div key={item.question} className="landing-faq-item" data-open={isOpen}>
                <button
                  type="button"
                  className="landing-faq-question"
                  onClick={() => setOpenFaq(isOpen ? null : idx)}
                  aria-expanded={isOpen}
                >
                  <span className="flex items-center gap-2">
                    <HelpCircleIcon className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>{item.question}</span>
                  </span>
                  <ChevronDownIcon
                    className={`w-5 h-5 transition-transform duration-200 ${
                      isOpen ? "rotate-180 text-emerald-600" : "text-gray-400"
                    }`}
                  />
                </button>
                {isOpen && (
                  <div className="landing-faq-answer">
                    <p>{item.answer}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* Floating Active Promo Pill */}
      {heroPromo ? (
        <Link href="/outlets" className="landing-floating-promo" aria-label="Active promo offer">
          <TagIcon className="w-4 h-4 text-emerald-300" />
          <div>
            <span>CODE: {heroPromo.code}</span>
            <strong>{heroPromo.discountPercent}% OFF</strong>
          </div>
        </Link>
      ) : null}

      {/* Deep Consumer Footer */}
      <footer className="landing-footer" aria-label="Footer navigation">
        <div className="landing-footer__container">
          <div className="landing-footer__col landing-footer__col--brand">
            <BrandLogo className="w-32" priority />
            <p className="landing-footer__tagline">
              One app. Many kitchens. Single checkout. The smartest way to order food across RSC
              kitchens in Nigeria.
            </p>
            <p className="landing-footer__copyright">
              © {new Date().getFullYear()} RSC Group Ltd. All rights reserved.
            </p>
          </div>

          <div className="landing-footer__col">
            <h4>Quick Links</h4>
            <ul>
              <li>
                <Link href="/outlets">All Kitchens</Link>
              </li>
              <li>
                <Link href="#specials">Popular Specials</Link>
              </li>
              <li>
                <Link href="/cart">Your Cart</Link>
              </li>
              <li>
                <Link href="/sign-in">Customer Sign In</Link>
              </li>
            </ul>
          </div>

          <div className="landing-footer__col">
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

          <div className="landing-footer__col">
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
                <span className="text-gray-400 text-sm">RSC Partner Outlets</span>
              </li>
            </ul>
          </div>
        </div>
      </footer>
    </main>
  );
}
