import { Button, ThemeToggle } from "@rsc/ui";
import Link from "next/link";

const principles = [
  {
    eyebrow: "One basket",
    title: "Mix favourites across kitchens",
    copy: "Browse multiple RSC outlets without juggling separate carts.",
  },
  {
    eyebrow: "One payment",
    title: "A checkout that stays understandable",
    copy: "See the full order total before payment and recover safely if the network drops.",
  },
  {
    eyebrow: "One timeline",
    title: "Track every kitchen together",
    copy: "Follow preparation and delivery while each outlet works its own sub-order.",
  },
] as const;

export default function HomePage() {
  return (
    <main>
      <header className="site-header">
        <Link className="brand" href="/" aria-label="RSC Kitchens home">
          {/* <span className="brand__mark">R</span> */}
          <span className="text-[var(--rsc-brand)] text-xl font-bold">
            <span className="text-[var(--rsc-main)]">RSC</span> Food
          </span>
        </Link>
        <nav className="text-[var(--rsc-main)]" aria-label="Primary navigation">
          <Link href="#how-it-works">How it works</Link>
          <Link href="/outlets">Outlets</Link>
        </nav>
        <div className="flex items-center gap-3 justify-self-end">
          <ThemeToggle />
          <Link href="/sign-in" className="rsc-button--quiet">
            Sign in
          </Link>
        </div>
      </header>

      <section className="hero">
        <div className="hero__copy">
          <p className="eyebrow">More kitchens. One delicious decision.</p>
          <h1>Your favourites, across RSC, in a single order.</h1>
          <p className="hero__lede">
            Build a meal across participating outlets, pay once, and keep the whole order in view
            from kitchen to doorstep.
          </p>
          <div className="hero__actions">
            <Link href="/outlets">
              <Button>Explore Kitchens</Button>
            </Link>
            <Link href="#how-it-works">See how multi-outlet orders work</Link>
          </div>
        </div>

        <div className="order-preview" aria-label="Illustrative multi-outlet order">
          <p className="order-preview__label">Tonight&apos;s table</p>
          <h2>4 kitchens, one checkout</h2>
          <ul>
            <li>
              <span>RSC Fire &amp; Spice</span>
              <strong>2 items</strong>
            </li>
            <li>
              <span>RSC Garden Bowl</span>
              <strong>1 item</strong>
            </li>
            <li>
              <span>RSC Sweet Room</span>
              <strong>2 items</strong>
            </li>
            <li>
              <span>RSC Hot Pot</span>
              <strong>1 item</strong>
            </li>
          </ul>
          <div className="order-preview__total">
            <span>Estimated total</span>
            <strong>₦32,450</strong>
          </div>
        </div>
      </section>

      <section className="principles" id="how-it-works">
        {principles.map((principle) => (
          <article key={principle.eyebrow}>
            <p className="eyebrow">{principle.eyebrow}</p>
            <h2>{principle.title}</h2>
            <p>{principle.copy}</p>
          </article>
        ))}
      </section>

      <section className="outlet-callout" id="outlets">
        <div>
          <p className="eyebrow">Built for Lagos evenings</p>
          <h2>Fresh menus, clear availability, no checkout surprises.</h2>
        </div>
        <Link href="/outlets">
          <Button>Browse participating outlets</Button>
        </Link>
      </section>
    </main>
  );
}
