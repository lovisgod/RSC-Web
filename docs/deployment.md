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
```

Generate the two passwords locally and paste the results into Dokploy:

```bash
openssl rand -hex 32
openssl rand -hex 32
```

Dokploy writes variables to a `.env` file next to the Compose file. The Compose
configuration explicitly passes `PUBLIC_API_URL` and `APP_VERSION` as Docker
build arguments. `POSTGRES_PASSWORD` and `REDIS_PASSWORD` remain server-side
Compose variables and must never use a `NEXT_PUBLIC_` or `VITE_` prefix.

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

### API DNS

In Namecheap **Advanced DNS**, add:

| Type     | Host      | Value          | TTL       |
| -------- | --------- | -------------- | --------- |
| A Record | `api-dev` | `72.61.202.26` | Automatic |

In Dokploy **Domains**, add:

| Setting        | Value                |
| -------------- | -------------------- |
| Service        | `api`                |
| Domain         | `api-dev.rscapp.xyz` |
| External path  | `/`                  |
| Internal path  | `/`                  |
| Strip path     | Off                  |
| Container port | `4000`               |
| HTTPS          | On                   |
| Certificate    | Let's Encrypt        |

Redeploy the Compose service after adding the domain. Then verify:

```text
https://api-dev.rscapp.xyz/api/v1
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
