# Deployment guide

Development deployment currently uses Dokploy's native GitHub provider:

```text
push to dev
  → Dokploy receives the GitHub App event
  → Dokploy clones lovisgod/RSC-Web at dev
  → Docker Compose builds the API, customer-web, and central-admin
  → PostgreSQL/PostGIS and Redis become healthy
  → the one-shot migration service applies pending migrations
  → Dokploy replaces the running containers
```

GitHub Environment secrets, GHCR credentials, a Dokploy API token, and a
server-side repository clone are not required for this development path.

## Current Dokploy Compose configuration

In the `rsc-web-development` Compose service:

| Setting        | Value                         |
| -------------- | ----------------------------- |
| Provider       | GitHub                        |
| GitHub account | `RSC-Dokploy`                 |
| Repository     | `lovisgod/RSC-Web`            |
| Branch         | `dev`                         |
| Compose path   | `deploy/dokploy/compose.yaml` |
| Trigger type   | `On Push`                     |
| Compose type   | Docker Compose                |

Click **Save**, then enable **Autodeploy**.

Use **Preview Compose** before deployment. It should show `api`, `api-migrate`,
`postgres`, `redis`, `customer-web`, and `central-admin`.

## Staging environment

Create staging as a second Dokploy Compose service. Do not edit or duplicate the
development service in place. Both services can use
`deploy/dokploy/compose.yaml`; `DEPLOY_ENV=staging` gives the staging Compose
project its own service names, network, PostgreSQL volume, and Redis volume.

Create or select a Dokploy project environment named `staging`, then create a
Docker Compose service named `rsc-web-staging` with:

| Setting        | Value                         |
| -------------- | ----------------------------- |
| Provider       | GitHub                        |
| GitHub account | `RSC-Dokploy`                 |
| Repository     | `lovisgod/RSC-Web`            |
| Branch         | `staging`                     |
| Compose path   | `deploy/dokploy/compose.yaml` |
| Trigger type   | `On Push`                     |
| Compose type   | Docker Compose                |

The promotion path is:

```text
feature branch -> pull request to dev -> pull request from dev to staging
  -> push/merge on staging -> Dokploy staging autodeploy
```

Paste the contents of `deploy/dokploy/staging.env.example` into the staging
service's **Environment** tab, replacing every placeholder. Generate new values
for staging rather than copying development secrets:

```bash
openssl rand -hex 32
openssl rand -hex 32
openssl rand -base64 32
openssl rand -hex 32
openssl rand -hex 32
```

Use a separate Termii API key for staging when the Termii account supports it.
Keep its balance and sending limits low. The staging registration endpoint is a
public SMS-triggering endpoint, so do not enable real Termii delivery until the
staging domains are access-restricted or API rate limiting is in place.

### Staging DNS

In Namecheap **Advanced DNS**, add these records. They point to the same Dokploy
server; Traefik routes each hostname to the correct staging container.

| Type     | Host            | Value          | TTL       |
| -------- | --------------- | -------------- | --------- |
| A Record | `staging`       | `72.61.202.26` | Automatic |
| A Record | `admin-staging` | `72.61.202.26` | Automatic |
| A Record | `api-staging`   | `72.61.202.26` | Automatic |

Remove conflicting parking, URL redirect, CNAME, or duplicate A records for
these three hosts.

### Staging domains

In the staging Compose service's **Domains** tab, add:

| Service         | Domain                     | Port   |
| --------------- | -------------------------- | ------ |
| `customer-web`  | `staging.rscapp.xyz`       | `3000` |
| `central-admin` | `admin-staging.rscapp.xyz` | `8080` |
| `api`           | `api-staging.rscapp.xyz`   | `4000` |

For every domain use external path `/`, internal path `/`, **Strip path Off**,
HTTPS **On**, and a Let's Encrypt certificate. Save the domains, then redeploy
the staging Compose service so Dokploy applies the routing configuration.

Verify DNS before requesting certificates:

```bash
dig +short staging.rscapp.xyz
dig +short admin-staging.rscapp.xyz
dig +short api-staging.rscapp.xyz
```

All three commands must return `72.61.202.26`. After deployment, verify:

```text
https://staging.rscapp.xyz
https://admin-staging.rscapp.xyz
https://api-staging.rscapp.xyz/api/v1/health/live
https://api-staging.rscapp.xyz/api/v1/health/ready
https://api-staging.rscapp.xyz/api/docs
```

In **Containers**, staging names should begin with `rsc-web-staging`. In
**Volumes**, confirm staging has separate PostgreSQL and Redis volumes before
creating test customer data. Configure a staging PostgreSQL volume backup on a
different schedule from development.

## Dokploy environment variables

Open the Compose service's **Environment** tab and add:

```dotenv
DEPLOY_ENV=development
PUBLIC_API_URL=https://api-dev.rscapp.xyz
APP_VERSION=development
POSTGRES_PASSWORD=replace-with-a-long-random-value
REDIS_PASSWORD=replace-with-a-different-long-random-value
CORS_ORIGINS=https://dev.rscapp.xyz,https://admin-dev.rscapp.xyz
SWAGGER_ENABLED=true
PII_ENCRYPTION_KEY=replace-with-output-of-openssl-rand-base64-32
PII_HASH_PEPPER=replace-with-output-of-openssl-rand-hex-32
OTP_PEPPER=replace-with-another-output-of-openssl-rand-hex-32
SMS_PROVIDER=termii
TERMII_BASE_URL=https://v3.api.termii.com
TERMII_API_KEY=replace-with-termii-dashboard-key
TERMII_SENDER_ID=RSCApp
TERMII_CHANNEL=dnd
TERMII_TIMEOUT_MS=10000
```

Generate the two passwords locally and paste the results into Dokploy:

```bash
openssl rand -hex 32
openssl rand -hex 32
openssl rand -base64 32
openssl rand -hex 32
openssl rand -hex 32
```

Dokploy writes variables to a `.env` file next to the Compose file. The Compose
configuration explicitly passes `PUBLIC_API_URL` and `APP_VERSION` as Docker
build arguments. `POSTGRES_PASSWORD` and `REDIS_PASSWORD` remain server-side
Compose variables and must never use a `NEXT_PUBLIC_` or `VITE_` prefix.

`PII_ENCRYPTION_KEY`, both peppers, and `TERMII_API_KEY` are also server-only
secrets. Use the regional Termii base URL shown in the Termii dashboard and an
approved transactional sender ID. Keep `SMS_PROVIDER=noop` only when real SMS
delivery is intentionally disabled.

Do not put payment keys, database passwords, JWT secrets, or other server
credentials into browser-prefixed variables.

## API, PostGIS, and Redis

The development Compose stack contains:

- `postgres`: PostgreSQL 16 with PostGIS, stored in the
  `rsc-postgres-data` volume.
- `redis`: password-protected Redis with append-only persistence in the
  `rsc-redis-data` volume.
- `api-migrate`: a one-shot container that runs TypeORM migrations before the
  API starts. A failed migration prevents the API from starting.
- `api`: the NestJS HTTP service on internal port `4000`.

Do not publish ports `5432` or `6379` to the internet. The API reaches both
services through the private Compose network.

### Development DNS and domains

In Namecheap **Advanced DNS**, add all three development records:

| Type     | Host        | Value          | TTL       |
| -------- | ----------- | -------------- | --------- |
| A Record | `dev`       | `72.61.202.26` | Automatic |
| A Record | `admin-dev` | `72.61.202.26` | Automatic |
| A Record | `api-dev`   | `72.61.202.26` | Automatic |

Remove conflicting parking, URL redirect, CNAME, or duplicate A records for
these hosts. In Dokploy **Domains**, add all three routes:

| Service         | Domain                 | Port   |
| --------------- | ---------------------- | ------ |
| `customer-web`  | `dev.rscapp.xyz`       | `3000` |
| `central-admin` | `admin-dev.rscapp.xyz` | `8080` |
| `api`           | `api-dev.rscapp.xyz`   | `4000` |

For every route use external path `/`, internal path `/`, **Strip path Off**,
HTTPS **On**, and a Let's Encrypt certificate.

Save the domain configuration and redeploy the Compose service. DNS can resolve
while a Dokploy route is still missing; in that case Traefik returns a plain
`404 page not found` before the request ever reaches NestJS.

Verify DNS:

```bash
dig +short dev.rscapp.xyz
dig +short admin-dev.rscapp.xyz
dig +short api-dev.rscapp.xyz
```

All three must return `72.61.202.26`. Then verify the applications:

```text
https://dev.rscapp.xyz
https://admin-dev.rscapp.xyz
https://api-dev.rscapp.xyz/api/v1/health/live
https://api-dev.rscapp.xyz/api/v1/health/ready
https://api-dev.rscapp.xyz/api/docs
```

Swagger is enabled for development. Set `SWAGGER_ENABLED=false` in production
unless the documentation is intentionally public.

## First deployment without a domain

You can build and start the services before owning a domain:

1. Save the GitHub provider configuration.
2. Add the environment variables above.
3. Click **Preview Compose**.
4. Click **Deploy**.
5. Watch **Deployments** and **Logs** until both builds complete.
6. Confirm `postgres`, `redis`, `api`, `customer-web`, and `central-admin` are
   healthy. `api-migrate` should show a successful exit code of `0`.

Without a domain, the services are not publicly routed. Their ports are exposed
only to Dokploy's Docker network:

- `customer-web`: `3000`
- `central-admin`: `8080`
- `api`: `4000`

Once a domain is available, use Dokploy's **Domains** tab rather than adding
manual Traefik labels:

- Customer domain → service `customer-web`, port `3000`
- Admin domain → service `central-admin`, port `8080`
- API domain → service `api`, port `4000`

## Database backups

For development, configure a scheduled Dokploy volume backup for
`rsc-postgres-data` and retain multiple restore points. A volume backup is a
useful disaster-recovery layer, but a logical PostgreSQL backup is safer for a
running database. Before production, add a scheduled `pg_dump` job, upload its
encrypted output to off-server object storage, and test a restore.

Redis is currently a cache/runtime dependency. Back up `rsc-redis-data` only if
the application begins storing data there that cannot be rebuilt.

## GitHub Actions

`.github/workflows/ci.yml` remains responsible for pull-request and push
validation:

- formatting
- linting
- type checking
- tests
- production builds

CI does not deploy. Dokploy's GitHub App handles development autodeploy.

This means a direct push to `dev` can trigger Dokploy even if CI later fails.
Protect `dev` with pull requests and required CI checks when repository
administration access becomes available.

## Rollback

Dokploy keeps deployment history. For development rollback:

1. Open **Deployments**.
2. Select the last known-good deployment/commit.
3. Use Dokploy's redeploy or rollback action, depending on the installed version.
4. Verify both container health checks.

For production, move back to immutable registry images or another controlled
promotion mechanism. Building production directly on the KVM makes rollback,
artifact provenance, and resource isolation weaker.

## VPS capacity

Native Compose builds run on the KVM 2 server and can temporarily consume
substantial CPU, memory, and disk. The current two frontend images are
reasonable, but avoid simultaneous builds and monitor:

```bash
free -h
df -h /
docker system df
docker stats --no-stream
```

After adding NestJS, PostgreSQL, and Redis, review memory headroom immediately
and configure database backups before storing important development data.
