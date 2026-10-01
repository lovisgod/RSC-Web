---
name: rsc-sre-learning-progress
description: Evidence-based status tracker for the RSC-Web SRE learning journey.
---

# RSC-Web SRE Progress Tracker

**Current focus:** Module 2 — Stand up Prometheus/Grafana compose stack & Module 8 (k6) load baseline  
**Last updated:** 2026-10-01  
**Primary lab:** RSC-Web  
**Related lab:** GridyPig

Completion requires deployed or captured evidence (configs, metrics, dashboards, test results), not merely planned items. Update the current focus, checkboxes, and dated evidence whenever milestones are reached.

---

## Audited starting point

- **Compute & Deployments:** Single Hostinger KVM VPS (`72.61.202.26`), Dokploy Compose deployments from `staging` (staging) and `main` (production).
- **Core services:**
  - `api`: NestJS 11 HTTP REST service.
  - `api-migrate`: One-shot TypeORM migration gate before API readiness.
  - `customer-web`: Next.js 15 App Router web store.
  - `central-admin` & `outlet-admin`: Vite SPAs.
  - `postgres`: PostgreSQL 16 + PostGIS on volume `rsc-postgres-data`.
  - `redis`: Redis 7.4 (password-protected) on volume `rsc-redis-data`.
- **Existing operational assets:**
  - `/api/v1/health/live` (process check) and `/api/v1/health/ready` (DB + Redis connectivity).
  - Request ID middleware setting `x-request-id` header and response tracking.
  - Database backup controller & service.
  - Moment & Paystack split payment integrations with webhook idempotency.

---

## Module 0 — Reliability contract (SLIs / SLOs / Error budgets)

- [x] Define multi-outlet user journey SLIs (public catalog discovery, checkout flow, webhook processing, tracking).
- [x] Draft initial `docs/reliability/SLOs.md` with explicit formulas and 30-day targets.
- [x] Establish error budget burn-rate alert thresholds and feature freeze rules.
- [ ] Collect a 7-day staging and 14-day production baseline after missing metrics are added.
- [ ] Review and accept v1 targets using baseline evidence.

Notes / Evidence:

- 2026-10-01: Authored `docs/reliability/SLOs.md` defining availability/latency SLIs for catalog discovery (99.5%, P95 < 500ms), checkout initiation (99.9%, P95 < 1500ms), payment webhook processing (99.9%, < 1000ms), and order tracking (99.5%). Defined Google SRE multi-window burn-rate alert tiers (14.4x 1h, 6x 6h, 3x 24h, 1x 30d).

---

## Module 1 — Structured logging and Loki log aggregation

- [ ] Standardize NestJS API & Next.js logs into structured JSON output.
- [ ] Propagate correlation ID (`x-request-id`) through outbound payment/SMS integrations.
- [ ] Deploy lightweight Promtail/Docker log driver pipeline shipping container logs to Loki.
- [ ] Verify LogQL query finding an end-to-end checkout flow by request ID in under 30 seconds.

Notes / Evidence:

---

## Module 2 — Prometheus metrics and Grafana dashboards

- [x] Instrument `apps/api` with `prom-client` to expose RED metrics and internal saturation stats.
- [x] Implement per-segment URL normalizer in `ObservabilityService` to prevent high-cardinality metric explosion.
- [x] Expose `/api/v1/observability/metrics` returning Prometheus format with `@RawResponse()` envelope bypass.
- [x] Stand up Prometheus agent scraping API, Redis, and Traefik metrics (`deploy/observability/prometheus/prometheus.yml`).
- [x] Create and version Grafana dashboard JSON calculating Module 0 SLIs (`deploy/observability/grafana/dashboards/dineout-slo-dashboard.json`).
- [x] Auto-provision Prometheus datasource and DineOut SLO dashboard in Grafana provisioning configs.
- [x] Integrate `prometheus` and `grafana` services with memory caps (192MB) into `deploy/dokploy/compose.yaml`.

Notes / Evidence:

- 2026-10-01: Added `prom-client` to `@rsc/api`. Built `ObservabilityModule`, `ObservabilityService`, `ObservabilityMiddleware`, and `ObservabilityController`. Implemented `dineout_http_requests_total`, `dineout_http_request_duration_seconds`, `dineout_orders_created_total`, `dineout_payment_sessions_total`, and `dineout_payment_amount_minor_total`.
- 2026-10-01: Wired Prometheus scraper and Grafana service into `deploy/dokploy/compose.yaml` and created standalone `deploy/observability/compose.yaml`. Configured automated datasource provisioning and pre-loaded `dineout-slo-dashboard.json` displaying checkout/catalog availability & latency SLOs, request rates, 5xx faults, and memory saturation. Bound to `127.0.0.1:3001` (SSH tunnel ready) and exposed for Traefik routing. Added `GRAFANA_ADMIN_USER` and `GRAFANA_ADMIN_PASSWORD` to `deploy/dokploy/staging.env.example`, `deploy/dokploy/development.env.example`, and `deploy/observability/.env.example`.

---

## Module 3 — Distributed tracing

- [ ] Implement OpenTelemetry instrumentation across API boundaries and database operations.
- [ ] Propagate trace context through Next.js proxy -> NestJS -> TypeORM -> Payment gateways.
- [ ] Capture and visualize a multi-outlet checkout trace waterfall.

Notes / Evidence:

---

## Module 4 — Alerting and operational runbooks

- [x] Configure Prometheus & Grafana alerting with multi-window multi-burn-rate rules (`deploy/observability/prometheus/alerts.yml`, `deploy/observability/grafana/provisioning/alerting/`).
- [x] Configure email alert notifications routed via SMTP (`GF_SMTP_*`, `ALERT_EMAIL_RECIPIENT`).
- [ ] Add saturation alerts (disk usage, Postgres connection pool exhaustion, Redis memory).
- [ ] Author operational runbooks under `docs/reliability/runbooks/` for top 5 critical failure modes.

Notes / Evidence:

- 2026-10-01: Wired Prometheus alerting rules for `DineoutApiDown`, `DineoutHigh5xxErrorRate`, `DineoutCheckoutBurnRateCritical`, `DineoutHighLatencyP95`, and `DineoutProcessMemoryHigh`. Provisioned Grafana 11 unified alerting rules, default email contact point, and notification policy dispatching via existing SMTP relay to `${ALERT_EMAIL_RECIPIENT}`.

---

## Module 5 — Incident response & fault injection

- [ ] Define incident severity levels (SEV-1 to SEV-4) and triage escalation paths.
- [ ] Conduct a controlled staging fault injection drill (e.g. upstream payment timeout or Redis degradation).
- [ ] Document postmortem in `docs/reliability/incidents/` with root cause analysis and action items.

Notes / Evidence:

---

## Module 6 — Reproducible observability infrastructure

- [x] Create Dokploy-ready `deploy/observability/compose.yaml` (Prometheus, Grafana).
- [x] Enforce strict RAM/CPU resource limits to prevent noisy neighbor degradation on the VPS.
- [ ] Configure Traefik routing with TLS and access protection for Grafana/Prometheus.

Notes / Evidence:

- 2026-10-01: Standalone and Dokploy Compose services provisioned with strict 192MB RAM limits, internal Docker network communication, automated datasource provisioning, and dashboard auto-load.

---

## Module 7 — Deployment reliability & release safety

- [ ] Create post-deployment automated smoke test suite for staging deployments.
- [ ] Validate zero-downtime rolling reload behavior during Dokploy container updates.
- [ ] Document and test database migration rollback runbook.

Notes / Evidence:

---

## Module 8 — Load testing and capacity planning with k6

- [ ] Install and configure k6 test framework under `tests/load/`.
- [ ] Write scenario 1: Menu discovery & catalog browse under concurrency.
- [ ] Write scenario 2: Multi-outlet cart & checkout calculation burst.
- [ ] Write scenario 3: Payment webhook burst simulation.
- [ ] Benchmark VPS capacity, identify bottlenecks (CPU vs DB pool vs event loop), and document operating ceiling.

Notes / Evidence:

---

## Capstone — RSC Production Readiness Review

- [ ] Consolidate SLOs, dashboards, runbooks, drill reports, and k6 benchmark results into `docs/reliability/RSC-PRODUCTION-READINESS.md`.
