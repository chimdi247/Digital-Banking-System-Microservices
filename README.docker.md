# Running the Digital Banking System

One `docker-compose.yml` at the repo root runs the entire platform: MySQL,
Redis, Kafka (+ Zookeeper), Kafka UI, all 6 Spring Boot services, and the
React frontend.

## 1. Prerequisites

```bash
# Docker Engine + Compose plugin (Ubuntu 22.04/24.04)
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER   # log out/in after this
docker compose version          # should print v2.x
```

## 2. Configure environment variables

```bash
cp .env.example .env
nano .env
```

At minimum, set:
- **`MYSQL_ROOT_PASSWORD`** — your database password.
- **`JWT_SECRET`** — a random 32+ character string (`openssl rand -hex 32`).
  A real one is pre-filled in `.env.example`, fine for local dev.
- **`VITE_API_BASE_URL`** — if deploying to a VM, this must be your VM's
  public IP/domain plus the gateway's port (e.g. `http://203.0.113.10:8080`),
  **not** `localhost` and not an internal Docker service name. It's baked
  into the frontend's JS bundle at build time — see the comment in
  `.env.example` for why.
- **`RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET`** — only needed if you want the
  Top Up / Payments page to work. Without real keys, every other feature
  (accounts, transfers, admin) works fine; only payment order creation will
  fail with a clear error.

## 3. Build and start

```bash
docker compose up -d --build
```

First build takes a while (Maven dependency resolution for 6 services, plus
the frontend's `npm install`/`vite build`). Watch progress:

```bash
docker compose logs -f
```

## 4. Database tables + the admin login are created automatically

`docker/mysql/init/` is mounted into the MySQL container at
`/docker-entrypoint-initdb.d`, which MySQL executes automatically — but only
the **first time** it starts with an empty data volume:

- **`01-schema.sql`** creates `account_db`, `transaction_db`, `payment_db`
  and every table each service needs, before any service has a chance to
  connect. (Each service's `ddl-auto: update` will also double-check the
  schema on boot, but since these tables already match exactly, that's a
  no-op.)
- **`02-seed-admin-user.sql`** inserts a ready-to-use login:

  ```
  email:    admin@example.com
  password: password123
  ```

  The password is stored as a bcrypt hash, not plaintext — generated the
  same way account-service hashes passwords at registration, so it verifies
  correctly at login. **Change or remove this user before using this
  anywhere other than local development.**

If you ever need to re-run the init scripts (e.g. after changing them),
you must wipe the MySQL volume first — see "Common operations" below.

## 5. Log in

Open the frontend (`http://localhost:3000` by default) and log in with the
seeded admin account above, or register a new user. After registering/
logging in, open your first bank account from the dashboard — a login
(`User`) and a bank account (`Account`) are separate concepts here: one
person can hold several accounts, so account-opening is a deliberate second
step.

## 6. The transfer flow, and where the OTP goes

Transfers run through a SAGA: money is deducted immediately, then a fraud
check runs asynchronously over Kafka. Depending on the amount/pattern:

- **Clean** → completes automatically within a couple of seconds.
- **Suspicious** → moves to `PENDING_VERIFICATION` and a one-time code is
  generated. The frontend will prompt for it.
- **High risk** → `FLAGGED`, blocked outright, funds returned.

**Important:** `notification-service` in this project only logs
notifications — it doesn't send real SMS/email. To find the OTP for a
pending transfer:

```bash
docker compose logs notification-service | grep -i otp
```

The frontend's verification dialog reminds you of this.

## 7. Check everything is healthy

```bash
docker compose ps
```

Kafka UI is available at `http://localhost:8090` (or `$KAFKA_UI_PORT`) if
you want to inspect topics/consumer groups directly.

## 8. Common operations

```bash
# Rebuild + restart a single service after a code change
docker compose up -d --build account-service

# Rebuild the frontend after changing VITE_API_BASE_URL in .env
docker compose up -d --build frontend

# Tear everything down (keeps the MySQL volume/data)
docker compose down

# Tear down AND wipe the database (re-runs docker/mysql/init/* next start)
docker compose down -v
```

## What changed from the original repo

The backend had no authentication at all — no `User` entity, no login
endpoint, no JWT. Since the request was for the frontend to be able to log
in, this was added:

- **account-service**: a `User` entity (separate from `Account` — one person
  can hold multiple bank accounts) with BCrypt-hashed passwords, JWT
  issuing, and `/api/v1/accounts/auth/{register,login,me}`.
- **api-gateway**: a global filter that validates the JWT on every request
  except login/register/actuator, and global CORS config so the browser can
  call it directly. Downstream services were deliberately *not* given their
  own Spring Security filter chains — internal service-to-service calls
  (e.g. transaction-service → account-service for balance checks) bypass the
  gateway entirely, so securing them individually would have broken those
  calls without real benefit in a single-host deployment.

Other fixes made along the way:
- Transaction history only showed money **sent**, never **received** — a
  real bug, now fixed.
- Every service threw raw `RuntimeException`s that surfaced as opaque 500s
  with no message. Added a `GlobalExceptionHandler` per service so the
  frontend gets an actual error message to show.
- Added `GET /api/v1/accounts/by-email/{email}`, `GET /api/v1/accounts`
  (admin), `GET /api/v1/payments/{id}`, and `GET /api/v1/payments/account/{accountNumber}`
  — none of these existed, and the frontend needs all of them.

## Known limitations

- **Razorpay webhooks need a public URL.** Locally, `payment-service` will
  never receive Razorpay's confirmation webhook unless you tunnel it (e.g.
  `ngrok http 8083`) and register that URL in the Razorpay dashboard. The
  frontend will sit on "waiting for confirmation" until it does.
- **The `deduct`/`credit` endpoints on account-service are reachable through
  the gateway**, not just internally — they're SAGA-internal steps that
  transaction-service calls directly, container-to-container, so the
  gateway route was never meant to expose them publicly. This was a
  pre-existing gap; hardening it (e.g. network-level segregation so only
  internal callers can reach them) is a reasonable next step but was out of
  scope here. The frontend never calls these endpoints directly.
- **Single Kafka broker, single MySQL instance** — fine for one VM, not
  fault-tolerant. No TLS/reverse proxy is configured either; put
  Nginx/Caddy/Traefik or a cloud load balancer in front for anything
  beyond local use.
