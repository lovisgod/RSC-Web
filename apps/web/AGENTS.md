# Customer web agent guide

- Keep pages and layouts as Server Components by default.
- Add `"use client"` only at the smallest interactive boundary.
- Public outlet/menu pages should use Next metadata and deliberate caching.
- Never trust cached catalog data for checkout totals or availability.
- Keep the cart client-side, versioned, and free of tokens or customer PII.
- Payment success is confirmed by backend state, not a browser redirect alone.
- Customer-facing copy should be calm, plain, and recovery-oriented.
