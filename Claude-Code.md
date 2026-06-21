# TicketUno — Architecture Review Session 1

## Project overview
TypeScript monorepo (npm workspaces + yarn 4), pre-alpha.
Theater seat reservation PWA targeting small Italian venues.
Deployed on Fly.io (staging + production environments).

## Monorepo structure
  backend/          Node.js + Express + sqlite3 (async, NOT better-sqlite3)
  frontend/         React 18 + Vite 6 + MUI v5 + React Router v6
  packages/shared/  (@ticketuno/shared) types, utils, i18n, roles

## Key files to read first (priority order)
  backend/src/server.ts
  backend/src/db/database.ts
  backend/src/middleware/auth.ts
  backend/src/routes/paymentsStripe.ts
  backend/src/services/paymentStripeService.ts
  backend/src/services/hmacService.ts
  packages/shared/src/types/stripe.ts
  packages/shared/src/types/bookings.ts
  packages/shared/src/utils/roles.ts
  backend/src/config.ts
  packages/shared/src/config.ts

## Already implemented (do not suggest reimplementing)
- Per-seat booking (one row per seat, booking_ref UUID)
- PDF tickets (PDFKit, HMAC-signed QR codes via hmacService)
- Transactional email (Resend + MJML + Handlebars)
- Push notifications (VAPID, web-push, no Firebase)
- PWA (Workbox injectManifest, custom sw.ts)
- i18n client + server (i18next, 4 locales: it/en/fr/zh)
- Multi-currency (in shared types)
- RBAC (shared/utils/roles.ts, isomorphic)
- Google OAuth (google-auth-library)
- Reminder jobs (node-cron)
- Stripe integration: PARTIAL — stripe@22 installed,
  paymentsStripe.ts and paymentStripeService.ts exist
  but integration is incomplete

## NOT yet implemented
- Multi-tenancy: currently single tenant, single SQLite DB
  Target: one DB per tenant, routed by hostname
  (tenant1.ticketuno.app → /data/tenants/tenant1.db)
- Stripe Connect Standard: per-tenant accounts,
  application_fee model, frontend redirection to stripe payment form based on configured payment modes, onboarding flow
- Test suite (deferred)

## My goals for this session (in priority order)
1. Understand what Stripe integration already exists
   in paymentsStripe.ts / paymentStripeService.ts / types/stripe.ts
   and what is missing to complete it
2. Identify the critical architectural issues that would
   block or complicate multi-tenancy (especially around
   how database.ts is currently used across the codebase)
3. Flag any security issues (auth middleware, HMAC usage,
   JWT handling, env var exposure to frontend build)

## Output format requested
Please structure your response as:

### A) Stripe integration — current state
What is already implemented, what is missing,
what needs to change for Connect Standard + application fees.

### B) Multi-tenancy blockers
How is database.ts currently consumed across routes/services?
What is the minimal refactor needed to support per-request
DB instance injection (middleware pattern)?
List affected files, no code yet.

### C) Security red flags
Top issues only, ranked by severity. Be concise.

### D) One thing I should fix first
Single most impactful change before adding any new feature.

## Constraints
- Do NOT suggest rewriting working features
- Do NOT write code yet (except minimal illustrative snippets)
- Do NOT cover testing (deferred)
- Flag if you need to read additional files before answering