# Deployment guide

Development deployment currently uses Dokploy's native GitHub provider:

```text
push to dev
  → Dokploy receives the GitHub App event
  → Dokploy clones lovisgod/RSC-Web at dev
  → Docker Compose builds customer-web and central-admin
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

Use **Preview Compose** before the first deployment. It should show build
definitions for both services, not `ghcr.io` images.

## Dokploy environment variables

Open the Compose service's **Environment** tab and add:

```dotenv
DEPLOY_ENV=development
PUBLIC_API_URL=
APP_VERSION=development
```

`PUBLIC_API_URL` may remain empty while the backend API is not deployed. It is a
browser-visible build argument, not a secret. Set it later to the public API
origin, for example:

```dotenv
PUBLIC_API_URL=https://api-dev.example.com
```

Dokploy writes variables to a `.env` file next to the Compose file. The Compose
configuration explicitly passes `PUBLIC_API_URL` and `APP_VERSION` as Docker
build arguments.

Do not put payment keys, database passwords, JWT secrets, or other server
credentials into browser-prefixed variables.

## First deployment without a domain

You can build and start the services before owning a domain:

1. Save the GitHub provider configuration.
2. Add the environment variables above.
3. Click **Preview Compose**.
4. Click **Deploy**.
5. Watch **Deployments** and **Logs** until both builds complete.
6. Confirm both containers are healthy under **Containers**.

Without a domain, the services are not publicly routed. Their ports are exposed
only to Dokploy's Docker network:

- `customer-web`: `3000`
- `central-admin`: `8080`

Once a domain is available, use Dokploy's **Domains** tab rather than adding
manual Traefik labels:

- Customer domain → service `customer-web`, port `3000`
- Admin domain → service `central-admin`, port `8080`

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

Before adding NestJS, PostgreSQL, Redis, workers, and monitoring, review memory
headroom and configure database backups.
