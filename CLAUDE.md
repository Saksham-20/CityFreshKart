# CityFreshKart

Grocery-delivery PWA. Monorepo: `client/` (React) + `server/` (Express/Postgres). India-focused (₹, phone-based auth, Razorpay).

## Stack

- **Client**: React 18 (CRA `react-scripts`), React Router 6, Zustand (`store/useAuthStore`, `useCartStore`, `productStore`), Tailwind 3 + custom MD3 color tokens, Framer Motion, Axios, Firebase client SDK (Google sign-in).
- **Server**: Express 4, PostgreSQL via `pg` — **raw SQL is source of truth** (`server/database/schema.sql`; Prisma schema exists but is not the live model), JWT (jsonwebtoken + bcryptjs), Razorpay, web-push (VAPID), Redis (optional, rate-limit backing), Winston logging.
- **Tests**: Playwright (root `tests/`), Jest (server).

## Commands

Run from repo root unless noted.

- `npm run dev` — server + client concurrently
- `npm run client` / `npm run server` — run one side
- `npm run build` — build client
- `npm run lint` / `npm run lint:fix` — ESLint (client `src/` + server, `.js`/`.jsx`)
- `npm test` — Playwright e2e; scoped: `test:auth`, `test:products`, `test:cart`, `test:checkout`, `test:mobile` (Mobile Chrome project)
- `npm run db:setup` / `npm run seed` — init/seed Postgres
- `npm run setup:env` — generate `.env` from example (`:force`, `:dry` variants)

## Layout

```
client/src/
  components/{layout,product,cart,auth,checkout,admin,payment,order,pwa,ui,common}/
  pages/        # route-level pages (ProductsPage, CartPage, CheckoutPage, LoginPage, Admin*Page…)
  store/        # Zustand: useAuthStore, useCartStore, productStore
  services/     # api.js (axios instance), firebase, razorpay
  hooks/        # useAuth, useCart, …
  utils/        # pwa.js, weightSystem, publicOrigin, safeReturnPath, imageUtils, cn
server/
  routes/       # auth, products, orders, cart, users, admin, addresses, razorpay, notifications, marketing
  middleware/   # auth (authenticateToken/optionalAuth/requireAdmin), rateLimit, validation
  services/     # authService, emailService, razorpayService, firebaseAdmin, redisClient
  database/     # config, setup, seed, schema.sql (source of truth), migrations/
```

Path aliases configured in `client/tsconfig.json`: `@components`, `@pages`, `@utils`, `@hooks`, `@context`, `@services`, `@store`.

## Routing & UI shell

- Routes live in `client/src/App.js` (React Router 6, lazy-loaded pages + `Suspense` `PageLoader`). Two shells:
  - `MainLayout` (Header + `<main>` + desktop-only Footer + `MobileBottomNav`) wraps all shopper routes.
  - `AdminLayout` (own sidebar) wraps `/admin/*` — fully separate from the shopper Header/Footer.
- Client routes: `/` = `ProductsPage` (the storefront grid), `/cart`, `/checkout`, `/orders`, `/orders/:orderId`, `/profile`, `/login`, `/admin/*`. `/products` redirects to `/` preserving search. Unknown → `/`.
- **There is no client product-detail route.** Products render only as cards in a grid (`ProductsPage` → `ProductGrid` → `ProductCard`). `pages/ProductDetailPage.js` + `components/product/ProductDetail.js` are **dead code** (no route, nothing links to them) — don't assume a detail page exists. (The server `GET /products/:id` endpoint still exists but the client never navigates to a detail screen.)
- **`MobileBottomNav`** (`components/layout/MobileBottomNav.js`, `md:hidden`) is auth-aware: logged out → Shop · Cart · Sign up; logged in → Shop · Cart · Orders · Profile. Hidden only on `/checkout` and `/admin/*`. On `/cart` the sticky "Proceed to checkout" bar is offset (`bottom-[4.5rem] md:bottom-0`) to stack above the nav — keep that offset in sync with nav height (`4.5rem`).
- Header (`components/layout/Header.js`) shows Sign in + Cart when logged out; user menu (Profile/Orders/Admin/Logout) only when `user` exists. No order/account actions leak to logged-out users.
- Toasts: `react-hot-toast`, single `<Toaster>` configured in `App.js` (top-center, MD3-themed). Use `toast.success/error`.
- Shared `components/common/BackButton.js` — chevron (`variant="back"`) or X (`variant="close"`); defaults to `navigate(-1)`, or pass `to`.

## Images

- `client/src/utils/imageUtils.js`: `getImageUrl()` resolves product/banner image paths (full URLs pass through; bare/relative → `${API origin}/uploads/...`). `getPlaceholderImage()` is an inline SVG fallback. `IMAGE_DIMS` holds intrinsic w/h per slot — always pass these to `<img width/height>` to avoid CLS.
- `ProductCard` accepts `priority` (first ~4 cards in `ProductGrid` get `fetchpriority=high` + eager load); rest are `loading="lazy"`. `components/common/LazyImage.js` is an IntersectionObserver fade-in wrapper (used sparingly).
- Uploaded images are served raw from the server `/uploads` static dir (multer disk storage, `server/middleware/upload.js`, `maxAge 7d`). **No server-side compression/resize/WebP currently** (`sharp` is a dependency but unused). External product images (Unsplash/Pexels) already carry `?w=&q=` params.

## Auth model (read before touching login/session code)

- Login is **phone + password** (10-digit phone, bcrypt hash) — not email/OTP for sign-in. OTP is only used for the forgot-password flow (phone → email → OTP → reset).
- On login/register the server issues a 7-day JWT and sends it **two ways**: as an httpOnly cookie (`authToken`, see `getAuthCookieOptions` in `server/routes/auth.js`) AND in the JSON body, which the client stores as `localStorage.token` + `localStorage.user`.
- Client request interceptor (`client/src/services/api.js`) attaches `Authorization: Bearer <token>` from `localStorage`, **except** when the token is the literal sentinel string `'authenticated_via_cookie'` — that means "rely on the httpOnly cookie only" (`withCredentials: true` sends it automatically).
- Server `authenticateToken` middleware accepts **either** the Bearer header **or** the `authToken` cookie (checks header first, falls back to cookie). `optionalAuth` does the same but never 401s — used for public-but-personalizable routes.
- `useAuthStore.initialize()` runs on every app boot: hydrates from `localStorage`, then calls `GET /auth/me` to validate. Be careful here — treat network/5xx failures differently from 401/403 (a transient blip must not destroy a valid 7-day session; this caused the Android "logged out on reopen" bug).
- `useAuthStore` (Zustand) is the **primary** auth store; `useAuth` hook wraps it. `context/AuthContext.js` is legacy/secondary — prefer the Zustand store + `useAuth` for new code.
- Cookie attributes matter for PWA/mobile: `sameSite`, `secure`, and `AUTH_COOKIE_DOMAIN` (must be dot-prefixed, e.g. `.cityfreshkart.com`, to work across `www`/non-`www`). `server/index.js` `getOriginVariants()` generates both host variants for CORS.

## Access model

- **Public** (no auth): browsing — `GET /api/products`, `/products/search`, `/products/:id`, `/products/categories`, `/products/carousel`. Anyone can browse and build a cart.
- **Cart**: pure `localStorage` (`useCartStore`, key `cart`) — client-side only, no server sync, survives login/logout.
- **Protected** (`authenticateToken` / `<ProtectedRoute>`): checkout, placing orders (`POST /api/orders`), order history, profile, admin (`requireAdmin` on top).
- Account is required at the **order/checkout step**, not for browsing.

## Conventions

- Styling: Tailwind utility classes using the custom MD3 token palette — `bg-surface-container-*`, `text-on-surface(-variant)`, `bg-primary`/`from-primary to-primary-container`, `rounded-3xl`, `shadow-editorial`. Match these tokens rather than introducing raw hex/arbitrary colors.
- Stock check pattern: a product is out of stock when `quantity_available <= 0` or `stock_quantity <= 0` (see `client/src/utils/stock.js`).
- Mobile-first: bottom nav (`MobileBottomNav`) + `env(safe-area-inset-bottom)`, header is `fixed` ~`3.75rem` tall, pages compensate with `pt-14` / `sticky top-14`. Keep these in sync when changing header height.

## Gotchas

- `client/public/sw.js` only handles Web Push display + a `CLEAR_CACHE_ON_LOGOUT` message — it has **no fetch handler**, so it does not cache API responses or pages. Don't blame it for stale-data bugs.
- CORS (`server/index.js`) deliberately allows requests with no `Origin` header and logs-but-allows mismatches — Android browsers/PWAs often omit `Origin`.
- `localStorage` keys in play: `token`, `user`, `cart`; `authToken` is cleared on logout but is actually an httpOnly-cookie name (not a JS-writable key) — don't be confused by it appearing in `removeItem` calls.
- Local `npm run lint` currently **fails to parse every client file** (`Parsing error: Cannot find module '@babel/plugin-proposal-class-properties'`) — environment/config issue, not your code. To validate client changes, run `CI=false npm run build` instead. Server `.js` files lint/`node --check` fine.

## Skill routing

When the user's request matches an available skill, invoke it via the Skill tool. When in doubt, invoke the skill.

Key routing rules:
- Product ideas/brainstorming → invoke /office-hours
- Strategy/scope → invoke /plan-ceo-review
- Architecture → invoke /plan-eng-review
- Design system/plan review → invoke /design-consultation or /plan-design-review
- Full review pipeline → invoke /autoplan
- Bugs/errors → invoke /investigate
- QA/testing site behavior → invoke /qa or /qa-only
- Code review/diff check → invoke /review
- Visual polish → invoke /design-review
- Ship/deploy/PR → invoke /ship or /land-and-deploy
- Save progress → invoke /context-save
- Resume context → invoke /context-restore
- Author a backlog-ready spec/issue → invoke /spec
