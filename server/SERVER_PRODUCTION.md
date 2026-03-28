# CityFreshKart API — production operations

This document complements environment variables in `.env` and the backend audit plan.

## Process model

- **Single Node instance:** default `express-rate-limit` behavior uses an in-memory store. Set `RATE_LIMIT_MAX_REQUESTS` and `RATE_LIMIT_WINDOW_MS` for your traffic profile.
- **PM2 cluster or multiple Node processes:** each process has its own memory store unless Redis is enabled. Set `REDIS_URL` so the global `/api` limiter uses a shared store (`rate-limit-redis`). Tune **per-instance** `RATE_LIMIT_MAX_REQUESTS` so `max × workers` matches your intended aggregate ceiling (for example, four workers at 125 req/window ≈ 500 total per window).

## Redis (optional)

- `REDIS_URL` — when set, enables Redis-backed **global API rate limiting** and optional **cache-aside** for product categories and store order settings.
- If Redis is unavailable at startup (or stops responding), the process **opens a circuit**: no more reconnect spam, in-memory rate limits, DB-only cache. **Restart the server** after fixing Redis to use it again.
- If you are not running Redis locally, **remove or comment `REDIS_URL`** in `.env` so the app does not try to connect.
- Cache TTL overrides: `CACHE_TTL_CATEGORIES_SEC`, `CACHE_TTL_STORE_SETTINGS_SEC`.

## Rate limiting

- Global API: `RATE_LIMIT_WINDOW_MS`, `RATE_LIMIT_MAX_REQUESTS` (skipped for `GET /api/health`, `GET /api/settings`, and all `/api/auth/*`).
- Auth: `AUTH_RATE_LIMIT_WINDOW_MS`, `AUTH_RATE_LIMIT_MAX`.
- Checkout / Razorpay mutating routes: `CHECKOUT_RATE_LIMIT_MAX` (production default 20 per 15 minutes per IP unless overridden).
- Admin uploads / product writes: `UPLOAD_RATE_LIMIT_MAX`, `ADMIN_PRODUCT_WRITE_MAX`.
- **Proxies:** with `NODE_ENV=production`, `trust proxy` is enabled. Terminate TLS at Nginx/ALB and forward the real client IP (for example `X-Forwarded-For`) so limits apply to end users.

## Health checks

- `GET /api/health` — lightweight liveness.
- Set `ENABLE_DEEP_HEALTH=1` to include a `SELECT 1` database check (use for load balancers that need DB readiness; keep off for cheap k8s liveness if the DB is sometimes slow).

## Database setup

- `node server/database/setup.js` (or app boot) applies `schema.sql` and ordered migrations under `server/database/migrations/` (including idempotency and Razorpay dedup tables).

## Idempotency and payments

- `POST /api/orders` accepts `Idempotency-Key` (header) or `idempotency_key` (body). Keys are normalized (hashed) and stored per user; replays return HTTP 200 with the existing order payload and `idempotentReplay: true` on the inner flag where applicable.
- `POST /api/razorpay/verify-payment` records `payment_id` in `razorpay_payment_processed` so duplicate verification does not re-apply order updates.

## Optional metrics (future)

- Prometheus (`prom-client`) or Sentry can be added behind env flags without changing default behavior; see the audit plan Phase 6.
