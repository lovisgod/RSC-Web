"use client";

import type { MenuItemSummary } from "@rsc/contracts";
import { useQuery } from "@tanstack/react-query";
import {
  AwardIcon,
  BellIcon,
  CheckCircle2Icon,
  ChevronDownIcon,
  ChevronRightIcon,
  HeartIcon,
  HelpCircleIcon,
  HomeIcon,
  PlusIcon,
  ReceiptIcon,
  ShieldCheckIcon,
  ShoppingBagIcon,
  StarIcon,
  TagIcon,
  TruckIcon,
  UserIcon,
  UtensilsIcon,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import { OUTLETS_QUERY } from "@/src/hooks/use-outlets";
import { cartItemCount, formatNaira } from "@/src/lib/data/cart";
import { getDailySpecials, resolveSpecialImage } from "@/src/lib/data/daily-specials";
import { formatOutletRating, toDisplayOutlet } from "@/src/lib/data/outlets";
import { useAuthStore } from "@/src/stores/auth-store";
import { useCartStore } from "@/src/stores/cart-store";
import { BrandLogo } from "@/src/components/shared/brand-logo";

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
    title: "Pick Outlets",
    subtitle: "Explore live outlets",
    copy: "Browse our curated network of live DineOut NG. Discover specialized menus from authentic Nigerian delicacies to artisanal continental favorites.",
    icon: UtensilsIcon,
  },
  {
    step: "02",
    title: "Build one cart",
    subtitle: "Mix & match freely",
    copy: "Add Jollof from Outlet A and Lebanese Mezze from Outlet B into one single cart. No split app orders or juggling separate deliveries.",
    icon: ShoppingBagIcon,
  },
  {
    step: "03",
    title: "Pay & track live",
    subtitle: "Single checkout & updates",
    copy: "Pay once securely. Watch each kitchen prepare your meals in real-time, then track your unified dispatch right to your doorstep.",
    icon: TruckIcon,
  },
] as const;

const faqItems = [
  {
    question: "Can I really order from multiple DineOut NG Outlets in one transaction?",
    answer:
      "Yes! DineOut NG enables you to add meals from different outlets into a single master cart and pay once. Our dispatch coordination system manages the cooking and pickup so your complete order arrives together.",
  },
  {
    question: "How does delivery pricing work for multi-outlets orders?",
    answer:
      "You pay a transparent delivery fee calculated for your overall trip, without having to pay full separate delivery charges for every single kitchen you order from.",
  },
  {
    question: "How do I track my order if outlets prepare food at different speeds?",
    answer:
      "Our live order tracking screen breaks down the progress of each kitchen in real-time — from kitchen prep and cooking to driver dispatch and final delivery.",
  },
  {
    question: "What payment methods do you accept?",
    answer:
      "We accept all major debit cards, bank transfers, and digital wallets via Paystack and Moment payment gateways with instant payment confirmation.",
  },
] as const;

export function LandingPage() {
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [addedToast, setAddedToast] = useState<string | null>(null);
  const [activeDailyPage, setActiveDailyPage] = useState(0);
  const dailyScrollerRef = useRef<HTMLDivElement | null>(null);

  const isSignedIn = useAuthStore((s) => s.isSignedIn);
  const cart = useCartStore((s) => s.cart);
  const addItemToCart = useCartStore((s) => s.addItem);
  const totalCartCount = cartItemCount(cart);

  const outletsQuery = useQuery(OUTLETS_QUERY);

  const outlets = (outletsQuery.data ?? []).map((outlet, index) => toDisplayOutlet(outlet, index));
  const featuredOutlets = outlets.slice(0, 4);
  const dailySpecials = getDailySpecials(outletsQuery.data ?? []);
  const dailyPageCount = Math.max(1, Math.ceil(dailySpecials.length / 3));
  // Clamp active page so it never exceeds the current page count (avoids setState-in-effect)
  const clampedActivePage = Math.min(activeDailyPage, dailyPageCount - 1);

  useEffect(() => {
    // Only update external DOM (scroll position) — no setState here
    dailyScrollerRef.current?.scrollTo({ left: 0 });
  }, [dailyPageCount]);

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

  function handleDailyScroll() {
    const scroller = dailyScrollerRef.current;
    if (!scroller) return;

    const maxScrollLeft = scroller.scrollWidth - scroller.clientWidth;
    if (maxScrollLeft <= 0) {
      setActiveDailyPage(0);
      return;
    }

    const scrollProgress = scroller.scrollLeft / maxScrollLeft;
    const nextPage = Math.round(scrollProgress * (dailyPageCount - 1));
    setActiveDailyPage(Math.min(Math.max(nextPage, 0), dailyPageCount - 1));
  }

  function scrollDailySpecials(page: number) {
    const scroller = dailyScrollerRef.current;
    if (!scroller) return;
    const maxScrollLeft = scroller.scrollWidth - scroller.clientWidth;
    const targetLeft = dailyPageCount <= 1 ? 0 : (maxScrollLeft / (dailyPageCount - 1)) * page;

    scroller.scrollTo({
      left: targetLeft,
      behavior: "smooth",
    });
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
        <span>Order across multiple DineOut NG outlets with one single checkout & delivery!</span>
        <Link href="#how-it-works" className="landing-top-banner__link">
          Learn how it works →
        </Link>
      </div>

      {/* Clean Full-Width Header Navigation */}
      <header className="landing-header" aria-label="DineOut NG navigation">
        <div className="landing-header__left">
          <Link href="/" className="inline-flex items-center" aria-label="DineOut NG home">
            <BrandLogo className="w-28 sm:w-36" priority />
          </Link>
        </div>

        <div className="landing-header__right">
          <Link
            href="/notifications"
            className="landing-icon-btn landing-notif-btn"
            aria-label="View notifications"
          >
            <BellIcon className="w-5 h-5" />
            <span className="landing-notif-dot" aria-hidden="true" />
          </Link>
        </div>
      </header>

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
            {featuredOutlets.map((outlet) => {
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
                          backgroundImage: `linear-gradient(180deg, rgba(0, 0, 0, 0.78) 0%, rgba(0, 0, 0, 0.15) 38%, rgba(0, 0, 0, 0.88) 100%), url(${outlet.image})`,
                          backgroundSize: "cover",
                          backgroundPosition: "center",
                        }
                      : {}),
                  }}
                >
                  {/* Card Header: Badges & Left-Aligned Outlet Name & Cuisine */}
                  <div className="grab-portrait-card__header">
                    <div className="grab-portrait-card__top-meta">
                      <span
                        className="grab-portrait-card__status"
                        data-online={outlet.isOnline !== false}
                      >
                        <span className="grab-portrait-card__status-dot" />
                        <span className="grab-portrait-card__status-label">
                          {outlet.isOnline !== false ? "Open" : "Closed"}
                        </span>
                      </span>
                      <span className="grab-portrait-card__rating">
                        <StarIcon className="w-3 h-3 fill-amber-400 text-amber-400" />
                        {formatOutletRating(outlet.rating)}
                      </span>
                    </div>

                    <div className="grab-portrait-card__title-group">
                      <h3 className="grab-portrait-card__title">{outlet.name}</h3>
                      <p className="grab-portrait-card__cuisine">
                        {outlet.cuisines?.length > 0
                          ? outlet.cuisines.join(" · ")
                          : "Wholesome Flavors"}
                      </p>
                    </div>
                  </div>

                  {/* Spacer to push CTA cleanly to the bottom */}
                  <div className="grab-portrait-card__spacer" />

                  {/* ORDER NOW CTA Pill Button */}
                  <div className="grab-portrait-card__footer">
                    <Link
                      href={isOffline ? "#" : `/outlets/${outlet.id}`}
                      className="grab-order-now-btn"
                      aria-label={`Order now from ${outlet.name}`}
                    >
                      <span className="grab-order-now-btn__text">
                        {isOffline ? (
                          "Closed"
                        ) : (
                          <>
                            <span className="grab-order-now-btn__label-full">Order Now</span>
                            <span className="grab-order-now-btn__label-mobile">Order</span>
                          </>
                        )}
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

      {/* Daily specials */}
      <section className="grab-section" id="specials" aria-labelledby="grab-specials-heading">
        <div className="grab-section__header">
          <div className="flex items-center gap-1.5">
            <span className="text-xl" role="img" aria-label="Fire">
              &#128293;
            </span>
            <h2 id="grab-specials-heading" className="grab-section__title">
              DAILY SPECIALS
            </h2>
          </div>
          <Link href="/daily-specials" className="grab-section__view-all">
            <span>View All</span>
            <ChevronRightIcon className="w-4 h-4" />
          </Link>
        </div>

        {dailySpecials.length === 0 ? (
          <div className="grab-empty">
            <UtensilsIcon className="w-8 h-8 text-emerald-500 mb-2" />
            <p>
              No daily specials set for today. Kitchens will publish today&apos;s specials soon!
            </p>
          </div>
        ) : (
          <>
            <div
              ref={dailyScrollerRef}
              className="grab-daily-specials-scroll"
              onScroll={handleDailyScroll}
              aria-label="Daily specials carousel"
            >
              {dailySpecials.map((special, idx) => {
                const discountPrice =
                  special.discountPriceMinor ?? special.currentPriceMinor ?? special.priceMinor;
                const originalPrice = special.priceMinor;
                const imageUrl = resolveSpecialImage(special);
                const isFirst = idx === 0;

                return (
                  <article key={special.id} className="grab-daily-special-card">
                    <div className="grab-daily-special-card__badge">
                      {isFirst ? (
                        "TODAY'S PICK"
                      ) : (
                        <>
                          <strong>{special.discountPercent}%</strong>
                          <span>OFF</span>
                        </>
                      )}
                    </div>

                    <div className="grab-daily-special-card__copy">
                      <h3 title={special.name}>{special.name}</h3>
                      <p>{special.description || special.outletName}</p>
                      <div className="grab-daily-special-card__prices">
                        <strong>{formatNaira(discountPrice)}</strong>
                        {originalPrice > discountPrice && <span>{formatNaira(originalPrice)}</span>}
                      </div>
                    </div>

                    <div className="grab-daily-special-card__image-wrap">
                      <img
                        src={imageUrl}
                        alt={special.name}
                        className="grab-daily-special-card__image"
                        loading="lazy"
                      />
                    </div>

                    <button
                      type="button"
                      className="grab-daily-special-card__add-btn"
                      aria-label={`Add ${special.name} to cart`}
                      onClick={() => handleQuickAddSpecial(special)}
                    >
                      <PlusIcon className="w-5 h-5 stroke-[2.5]" />
                    </button>
                  </article>
                );
              })}
            </div>

            {dailySpecials.length > 0 && (
              <div className="grab-pagination-dots" aria-label="Daily specials pages">
                {Array.from({ length: dailyPageCount }).map((_, page) => (
                  <button
                    key={page}
                    type="button"
                    aria-label={`Show daily specials page ${page + 1}`}
                    aria-current={clampedActivePage === page ? "true" : undefined}
                    className={`grab-pagination-dot${
                      clampedActivePage === page ? " grab-pagination-dot--active" : ""
                    }`}
                    onClick={() => scrollDailySpecials(page)}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </section>

      {/* Exclusive discounts */}
      <section
        className="grab-section"
        id="exclusive-discounts"
        aria-labelledby="grab-exclusive-discounts-heading"
      >
        <div className="grab-section__header">
          <div className="flex items-center gap-1.5">
            <TagIcon className="h-6 w-6 text-[var(--rsc-orange)]" aria-hidden="true" />
            <h2 id="grab-exclusive-discounts-heading" className="grab-section__title">
              EXCLUSIVE DISCOUNTS
            </h2>
          </div>
          <Link href="/notifications" className="grab-section__view-all">
            <span>View All</span>
            <ChevronRightIcon className="w-4 h-4" />
          </Link>
        </div>

        <div className="grab-promo-banner">
          <div className="grab-promo-banner__content">
            <div className="grab-promo-banner__title-lockup">
              <span className="grab-promo-banner__heading-white">HUNGRY FOR</span>
              <span className="grab-promo-banner__heading-green">MORE?</span>
            </div>
            <p className="grab-promo-banner__copy">
              Enjoy amazing deals from your favorite outlets daily!
            </p>
          </div>
          <div className="grab-promo-banner__graphic">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/assets/promo-burger-cutout.png"
              alt="Delicious DineOut deals"
              className="grab-promo-banner__food-img"
              loading="lazy"
            />
            <div className="grab-promo-banner__circle-badge" aria-label="Up to 30 percent off">
              <small>UP TO</small>
              <strong>30%</strong>
              <small>OFF</small>
            </div>
            <span className="grab-promo-banner__limited-ribbon">LIMITED TIME ONLY!</span>
          </div>
        </div>
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
              Ordering from multiple outlets used to mean multiple delivery fees and separate app
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
              specialized DineOut NG outlets in Nigeria.
            </p>
            <p className="grab-footer__copy">
              © {new Date().getFullYear()} DineOut Group Ltd. All rights reserved.
            </p>
          </div>

          <div className="grab-footer__links-col">
            <h4>Quick Links</h4>
            <ul>
              <li>
                <Link href="/outlets">All outlets</Link>
              </li>
              <li>
                <Link href="#specials">Daily Specials</Link>
              </li>
              <li>
                <Link href="#exclusive-discounts">Exclusive Discounts</Link>
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
        <Link href="/favorites" className="grab-bottom-nav__item">
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
