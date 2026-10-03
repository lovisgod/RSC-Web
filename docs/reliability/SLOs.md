# DineOut-Web Service Level Objectives (SLOs) & Reliability Contract

**Document Version:** 1.0  
**Effective Date:** 2026-10-01  
**Status:** Provisional (Baselining against Staging / Production)  
**System Architecture:** NestJS 11 (`apps/api`), Next.js 15 (`apps/web`), Vite SPAs (`apps/admin`, `apps/outlet-admin`), PostgreSQL 16 + PostGIS, Redis 7.4, Moment & Paystack payment gateways, Dokploy Docker Compose on Hostinger KVM VPS (`72.61.202.26`).

---

## 1. Principles & Error Budget Policy

1. **Error budgets represent the acceptable rate of failure:** 100% reliability is an anti-goal that inhibits deployment velocity.
2. **User experience determines the boundary:** Client-side input errors (HTTP 400, 401, 403, 404, 422) do not consume the platform error budget; server faults (HTTP 5xx, timeouts, upstream gateway unreachability) do.
3. **Automated Governance Rules:**
   - **Healthy Budget (> 50% remaining over 30 days):** Standard deployment cadence to staging and production.
   - **Degraded Budget (20% – 50% remaining):** Non-urgent feature deployments require SRE architectural sign-off. Focus shifts to reliability defect triage.
   - **Depleted Budget (< 20% remaining or 1h burn rate > 14.4x):** Immediate deployment freeze on feature branches. The engineering team exclusively focuses on system hardening, capacity remediation, or rollback until 72 hours of positive error budget recovery is demonstrated.

---

## 2. Core User Journey SLIs & SLOs

### Journey 1: Public Catalog & Menu Discovery

_Users browse outlets, filter categories, and inspect menu item details._

- **SLI 1.1 (Availability):**
  $$\text{SLI}_{\text{catalog\_avail}} = \frac{\sum \text{rate}(dineout\_http\_requests\_total\{route=\sim"/api/v1/(outlets|menu-items).*", status\_code=\sim"[23].."}[5m])}{\sum \text{rate}(dineout\_http\_requests\_total\{route=\sim"/api/v1/(outlets|menu-items).*", status\_code!=\sim"4[0-9]{2}"}[5m])}$$
  - **SLO:** **99.5% availability** over a rolling 30-day window.
  - **Error Budget:** 0.5% (approx. 216 minutes of allowable downtime / degraded responses per month).

- **SLI 1.2 (Latency):**
  $$\text{SLI}_{\text{catalog\_latency}} = \frac{\sum \text{rate}(dineout\_http\_request\_duration\_seconds\_bucket\{route=\sim"/api/v1/(outlets|menu-items).*", le="0.5"}[5m])}{\sum \text{rate}(dineout\_http\_request\_duration\_seconds\_count\{route=\sim"/api/v1/(outlets|menu-items).*"}[5m])}$$
  - **SLO:** **95% of catalog requests served in $\le$ 500ms** over rolling 30 days.

---

### Journey 2: Checkout & Payment Session Initiation (Tier 1)

_Customer submits a cart, system validates subtotal/VAT/commission, calculates outlet splits, and initiates an outbound session with Moment or Paystack._

- **SLI 2.1 (Availability):**
  $$\text{SLI}_{\text{checkout\_avail}} = \frac{\sum \text{rate}(dineout\_http\_requests\_total\{route="/api/v1/payments/initiate", status\_code=\sim"2.."}[5m])}{\sum \text{rate}(dineout\_http\_requests\_total\{route="/api/v1/payments/initiate", status\_code!=\sim"4(00|01|03|22)"}[5m])}$$
  - **SLO:** **99.9% availability** over a rolling 30-day window.
  - **Error Budget:** 0.1% (approx. 43.8 minutes of downtime / degraded responses per month).

- **SLI 2.2 (Latency):**
  $$\text{SLI}_{\text{checkout\_latency}} = \frac{\sum \text{rate}(dineout\_http\_request\_duration\_seconds\_bucket\{route="/api/v1/payments/initiate", le="1.5"}[5m])}{\sum \text{rate}(dineout\_http\_request\_duration\_seconds\_count\{route="/api/v1/payments/initiate"}[5m])}$$
  - **SLO:** **95% of checkout initiations completed in $\le$ 1500ms** (including outbound payment gateway round-trip) over rolling 30 days.

---

### Journey 3: Payment Webhook Processing & Settlement Integrity (Tier 1)

_Asynchronous callbacks from Moment / Paystack confirming charge success or failure, updating payment entity, triggering order transition, and queuing notifications._

- **SLI 3.1 (Timeliness & Success):**
  $$\text{SLI}_{\text{webhook\_success}} = \frac{\sum \text{rate}(dineout\_http\_requests\_total\{route="/api/v1/payments/webhook", status\_code="200"}[5m])}{\sum \text{rate}(dineout\_http\_requests\_total\{route="/api/v1/payments/webhook"}[5m])}$$
  - **SLO:** **99.9% of valid provider webhooks processed successfully** without 5xx or unhandled rejections over rolling 30 days.
  - **SLO Latency:** **99% of webhooks processed within $\le$ 1000ms** (avoiding provider webhook retries and duplicate storms).

---

### Journey 4: Customer Order Tracking & Realtime Updates

_Customer polls or connects to tracking endpoints to view delivery status._

- **SLI 4.1 (Availability):**
  $$\text{SLI}_{\text{tracking\_avail}} = \frac{\sum \text{rate}(dineout\_http\_requests\_total\{route=\sim"/api/v1/orders/:id.*", status\_code=\sim"[23].."}[5m])}{\sum \text{rate}(dineout\_http\_requests\_total\{route=\sim"/api/v1/orders/:id.*", status\_code!=\sim"4[0-9]{2}"}[5m])}$$
  - **SLO:** **99.5% availability** over rolling 30 days.

---

## 3. Multi-Window Multi-Burn-Rate Alerting Architecture

To avoid alert fatigue while catching catastrophic failures fast, DineOut-Web utilizes Google SRE multi-window burn rate alerts:

| Severity           | Burn Rate | % Budget Consumed      | Short Window | Long Window | Target Channel                              | Action                                                             |
| ------------------ | --------- | ---------------------- | ------------ | ----------- | ------------------------------------------- | ------------------------------------------------------------------ |
| **Page (SEV-1)**   | 14.4x     | 2.0% in 1 hour         | 5m           | 1h          | On-call / PagerDuty / Telegram              | Immediate triage; rollback deployment or restart failing container |
| **Page (SEV-2)**   | 6.0x      | 5.0% in 6 hours        | 30m          | 6h          | On-call / PagerDuty / Telegram              | Urgent mitigation; check provider degradation                      |
| **Ticket (SEV-3)** | 3.0x      | 10.0% in 24 hours      | 2h           | 24h         | Issue tracker / Slack `#alerts-reliability` | Daily standup triage; prioritize defect                            |
| **Ticket (SEV-4)** | 1.0x      | Full budget in 30 days | 6h           | 3d          | Issue tracker / Slack `#alerts-reliability` | Capacity planning review                                           |

---

## 4. Measurement & Verification Baseline

1. **Prometheus Metrics Provider:** Metrics are emitted by `apps/api` via `prom-client` at `GET /api/v1/observability/metrics`.
2. **Cardinality Rules:** Metric routes are normalized via `ObservabilityService.normalizeRoute` to replace UUIDs and entity IDs with `:id`.
3. **Baselining Plan:**
   - Run k6 load test scenarios (`tests/load/`) against staging to establish P50, P95, and P99 latency baselines under 10, 50, and 100 concurrent virtual users.
   - Adjust provisional thresholds if real-world network and payment provider round-trips require realistic tuning.
