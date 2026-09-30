---
name: sre-learning-journey
description: Guide hands-on SRE learning in RSC-Web using its real NestJS 11 API, Next.js customer web, Vite admin portals, PostgreSQL/PostGIS, Redis, Moment/Paystack payments, Dokploy Compose, and Hostinger VPS architecture. Use for SLOs, Prometheus metrics, Loki log shipping, Grafana dashboards, k6 load testing, alerting, and incident response.
---

# RSC-Web SRE Learning Journey

## Operating method

This is a hands-on curriculum against the real RSC-Web food ordering platform, not a generic tutorial. Before SRE work:

1. Read `docs/reliability/SRE-PROGRESS.md` and work on its current focus unless the user explicitly chooses another module.
2. Inspect the current implementation before proposing tools. Do not assume the original plan is still accurate.
3. Target tools: **Prometheus**, **Loki**, **Grafana**, and **k6**, optimized for a resource-constrained Hostinger KVM VPS managed by Dokploy Docker Compose.
4. Produce a repository artifact: code, configuration, dashboard export, k6 test scenario, runbook, or postmortem.
5. Verify the artifact proportionally and record dated evidence in `docs/reliability/SRE-PROGRESS.md`.
6. Never mark infrastructure "working" merely because configuration exists; require deployment evidence or a captured result.

## Current architecture baseline

- **Backend API:** NestJS 11 with TypeORM on PostgreSQL 16 + PostGIS and Redis 7.4.
- **Frontend web:** Next.js 15 App Router customer portal (`apps/web`).
- **Admin portals:** Vite SPAs for central staff (`apps/admin`) and outlet operators (`apps/outlet-admin`).
- **Payments:** Moment and Paystack split settlement with outlet subaccounts and platform retained fee allocations.
- **Hosting / Compute:** Single Hostinger KVM VPS (`72.61.202.26`) with Dokploy managing Docker Compose services.
- **Ingress / Edge:** Traefik reverse proxy handling Let's Encrypt TLS and domain routing (`staging.rscdev.tech`, `api-staging.rscdev.tech`, etc.).
- **Deployments:** GitHub webhooks trigger Dokploy Compose builds from `staging` (staging) or `main` (production).
- **Existing operations:** Database backup/restore controller, request ID middleware (`x-request-id`), health endpoints (`/api/v1/health/live`, `/api/v1/health/ready`), and pre-push validation gates.

## Curriculum

### Module 0 — Reliability contract (SLIs / SLOs / Error budgets)

Define user-journey SLIs for the multi-outlet food ordering experience:

- Catalog discovery & menu browsing availability/latency.
- Cart checkout & Moment/Paystack payment session initiation.
- Inbound payment webhook processing timeliness & idempotency integrity.
- Order dispatch & rider status tracking.

Maintain `docs/reliability/SLOs.md` with explicit formulas, 30-day rolling thresholds (e.g. 99.9% for payments, 99.5% for public menus), and burn-rate alert definitions.

_Evidence:_ Reviewed SLO document, PromQL query definitions, and provisional targets based on staging/production baselines.

### Module 1 — Structured logging and Loki log aggregation

Standardize application logs into machine-readable JSON across NestJS and Next.js.

- Ensure every log event includes timestamp, level, `requestId`, service name, and execution context.
- Propagate correlation through outbound HTTP calls (Moment, Paystack, Sling, Termii).
- Enforce PII redaction (phones, emails, customer names, card details, authorization headers).
- Deploy a lightweight Loki + Promtail/Docker logging driver pipeline to ingest Docker container logs on the VPS without starving API memory.

_Evidence:_ Locate any order checkout or payment session by `x-request-id` or payment reference across all containers in under 30 seconds using LogQL in Grafana.

### Module 2 — Prometheus metrics and Grafana dashboards

Instrument RSC-Web applications with Prometheus metrics:

- Integrate `prom-client` in `apps/api` to expose `/api/v1/observability/metrics` (protected or internal-only).
- Measure the 4 Golden Signals:
  - **Latency:** HTTP route duration histograms (P50, P95, P99).
  - **Traffic:** Requests per second split by route and outlet.
  - **Errors:** 4xx vs 5xx rates; provider-specific failures (Moment/Paystack).
  - **Saturation:** Node event loop lag, memory RSS, TypeORM connection pool utilization, Redis buffer depth.
- Provision versioned Grafana dashboard JSON configurations in `deploy/observability/grafana/`.

_Evidence:_ Exported Grafana dashboard JSON and screenshots calculating the Module 0 SLIs from live Prometheus metrics.

### Module 3 — Distributed tracing & transaction flows

Trace cross-boundary requests from customer browser through Next.js SSR, NestJS API, TypeORM database queries, Redis cache lookups, and outbound Moment/Paystack payment requests using OpenTelemetry (OTel).

_Evidence:_ Captured trace waterfall demonstrating a multi-outlet checkout flow with granular database and outbound provider spans.

### Module 4 — Alerting and operational runbooks

Implement multi-window multi-burn-rate alerting rules in Prometheus/Alertmanager:

- Page-worthy alerts: Rapid error budget consumption (e.g. 2% burned in 1 hour), database connection pool exhaustion, disk space < 15%.
- Ticket-worthy alerts: Slow error budget burn, memory creep, webhook retry backlog.
- Author declarative step-by-step mitigation runbooks in `docs/reliability/runbooks/` for top failure modes (payment gateway degradation, migration locks, Redis eviction, OOM recovery).

_Evidence:_ Tested alert rules firing into a test channel (Slack/Discord/Webhook) with verified links to operational runbooks.

### Module 5 — Incident response & fault injection

Establish incident triage protocols, severity definitions (SEV-1 to SEV-4), and a blameless postmortem template. Conduct controlled staging fault injection exercises:

- Upstream payment provider latency / timeout injection.
- Transient Redis outage during active user sessions.
- Database connection pool starvation.

_Evidence:_ Completed incident report / postmortem in `docs/reliability/incidents/` with root cause analysis and verified action items.

### Module 6 — Reproducible observability infrastructure

Package the observability stack (Prometheus, Loki, Promtail, Grafana) into Docker Compose / Dokploy configurations (`deploy/observability/compose.yaml`):

- Restrict resource usage (caps on RAM and CPU) so observability never impacts core ordering traffic.
- Secure access via Traefik basic auth / reverse proxy with TLS.
- Configure retention policies (e.g. 7-14 days for metrics and logs) to protect VPS disk space.

_Evidence:_ Working Compose stack deployed to the VPS with verified health and persistent storage.

### Module 7 — Deployment reliability & release safety

Harden Dokploy deployment pipelines:

- Automated post-deployment smoke tests that hit live health checks and critical API endpoints.
- Zero-downtime deployment validation during container replacement.
- Deterministic rollback runbook for bad migrations or broken application builds.

_Evidence:_ A recorded smoke-test suite and a verified rollback drill executed in staging.

### Module 8 — Load testing and capacity planning with k6

Author versioned k6 load testing suites under `tests/load/`:

- **Catalog browse:** High-concurrency read traffic simulating menu discovery across multiple outlets.
- **Cart & checkout:** Realistic multi-step user journeys (search -> select item -> calculate charges -> initiate checkout).
- **Webhook spike:** Bursts of concurrent payment confirmation webhooks from Moment/Paystack.
- Determine system breaking points, maximum supported RPS on the Hostinger VPS, and optimal pool sizes.

_Evidence:_ Versioned k6 scripts, execution test reports, latency percentiles under load, and a documented capacity envelope.

### Capstone — RSC Production Readiness Review

Produce `docs/reliability/RSC-PRODUCTION-READINESS.md` consolidating the reliability contract, Grafana dashboards, alert configurations, runbooks, fault injection results, and k6 capacity limits.

---

## Safety and operational constraints

- **VPS Resource Preservation:** The Hostinger VPS has finite RAM and CPU. Observability tools must be lean (Prometheus + Loki with tight memory limits and scrape intervals).
- **Staging-First Testing:** Run all load tests (k6), chaos injection, and experimental scrapers strictly against the staging environment (`staging.rscdev.tech`).
- **No Production Money Movement:** Use provider sandbox/test credentials (e.g. `MOMENT_SECRET_KEY=sk_test_...`) for all synthetic journeys and load scripts.
- **Cardinality Control:** Never use high-cardinality values (user IDs, order IDs, payment references, phone numbers) as Prometheus metric labels. Keep those strictly in logs (Loki) and traces.
- **Redaction:** Never emit plaintext passwords, JWTs, cardholder data, or encryption keys in logs or metric scrapers.
