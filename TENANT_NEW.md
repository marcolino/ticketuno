# Onboarding a new TicketUno tenant

Working checklist for adding a new tenant (theater/venue) to the platform.
Confirmed against `tenantRegistry.ts`, `tenantDbManager.ts`, `tenantContext.ts`.

---

## 0. Information to collect before starting

- [ ] **Tenant slug** — lowercase, `[a-z0-9-]{1,63}` (enforced by `SLUG_RE`
      in both `tenantRegistry.ts` and `tenantDbManager.ts`). Used as: DB
      directory name, uploads directory name, env var suffix.
- [ ] **Tenant domain(s)** — hostname(s) this tenant is served on. Can be
      real custom domains or subdomains of your platform — both work the
      same way, just entries in one `domains` array.
- [ ] **Business name** — Stripe Connect `business_profile.name`.
- [ ] **Admin contact email** — seeded admin login + Stripe
      `organizerEmail`.
- [ ] **Operator contact email** — seeded operator login (box-office
      staff).
- [ ] **Initial passwords** for both seeded accounts.
- [ ] **Timezone** (IANA id, e.g. `Europe/Rome`).
- [ ] **Currency** (e.g. `EUR`).
- [ ] **Payment gateway**: `stripe` / `cash` / `free`.
- [ ] **Logo image** (optional — can upload later via Settings).

---

## 1. Register the tenant

The registry lives at `<config.db.dataRoot>/tenants.json`, shaped as:

```json
{
  "tenants": [
    {
      "slug": "teatro-rossi",
      "domains": ["teatro-rossi.example.com"],
      "status": "active"
    }
  ]
}
```

- [ ] Add a new entry to this file. `status` must be `"active"` — anything
      else makes `resolveSlugByDomain()` return `null` (domain treated as
      unknown, requests 404).
- [ ] Do **not** populate `stripeAccountId` in this file by hand — it's
      not read by `rebuildIndex()` on load; the Stripe account index is
      built at runtime from each tenant's own database (see step 6). ⚠️
      This field on `TenantEntry` currently looks unused end-to-end —
      confirm intentionally before relying on it.
- [ ] Trigger a hot reload (no restart, no redeploy needed):
  ```bash
  curl -X POST https://<backend-host>/internal/tenants/reload \
    -H "x-internal-admin-token: $INTERNAL_ADMIN_TOKEN"
  ```
  This calls `tenantRegistry.reload()`, which re-reads the JSON file and
  rebuilds `domainToSlug`. Response includes the current slug list —
  confirm the new slug is there.

## 2. Database provisioning — fully automatic, no manual step

`tenantDbManager.getTenantDb(slug)` is called from the per-request tenant
resolution middleware in `server.ts`. If the slug isn't already loaded in
memory (`this.dbs`), it transparently calls `createTenantDb(slug)`, which:

1. Computes the DB path: `<dataRoot>/<slug>/<config.db.name>`.
2. `new Database().initialize(path, slug)` — creates the SQLite file if
   missing, runs `initSchema()`, `runMigrations()`, `createDefaultUsers()`,
   `createDefaultSetup()`.
3. Primes the setup cache and Stripe-account index for the tenant.

**Practically**: once step 1's reload completes, the *very first request*
to the new tenant's domain provisions everything on the fly. Nothing to
run manually, no restart, no `initializeAllTenants()` re-invocation needed
— that function is only for warming up *already-known* tenants at boot.

- [ ] Send one request to the new domain (even just loading the site) and
      confirm the DB file appears at `<dataRoot>/<slug>/<db-name>`.
- [ ] Check server logs for `Initializing tenant DB: <slug> -> <path>` to
      confirm it happened exactly once (not per-request — it's cached in
      `this.dbs` after the first call).

## 3. Set required environment variables

Per-tenant override convention: suffix = slug, **uppercased, hyphens →
underscores** (see `createDefaultUsers()` in `db/database.ts` — note the
DB layer uses this transform; keep it consistent with whatever the slug
in `tenants.json` actually is, since the registry's `SLUG_RE` allows
hyphens but env var names can't contain them):

- [ ] `ADMIN_USER_EMAIL_<SLUG>` / `ADMIN_USER_PASSWORD_<SLUG>`
- [ ] `OPERATOR_USER_EMAIL_<SLUG>` / `OPERATOR_USER_PASSWORD_<SLUG>`

These must be set **before** the first request provisions the tenant DB
(step 2) — `createDefaultUsers()` runs as part of that first
`initialize()` call and falls back to the shared, non-suffixed env vars
if the tenant-specific ones are missing. Don't let a production tenant
silently inherit the shared fallback credentials.

- [ ] Any additional per-tenant secrets this tenant specifically needs
      (see closing note below — most secrets are intentionally shared).

## 4. Seed / verify default users

- [ ] Confirm both seeded accounts (admin, operator) can log in, with
      `is_verified = 1` (no email confirmation required) and correct
      roles.
- [ ] Consider forcing a password change on first login (not currently
      automated).

## 5. Configure tenant settings

New tenants get `defaultGeneralSetup` seeded automatically. After first
admin login, go to **Settings**:

- [ ] **Currency**
- [ ] **Timezone** — defaults to `Europe/Rome` if untouched; affects every
      booking/scan timestamp shown to this tenant's operators.
- [ ] **Logo** — appears in app header, transactional emails, ticket PDFs.
- [ ] **Payment gateway** — `stripe` → continue to step 6; `cash`/`free` →
      skip to step 7.

## 6. Stripe Connect onboarding (gateway = `stripe` only)

- [ ] Trigger organizer onboarding from the admin UI
      (`stripeConnectApi.onboard({ organizerEmail, businessName })`).
- [ ] ⚠️ Still unconfirmed: whether this calls `createConnectedAccount`
      (per-user) or `createPlatformConnectedAccount` (single deployment
      account) in `paymentStripeService.ts` — these look like two
      different flows; check which the onboarding route actually invokes
      before relying on this step's details.
- [ ] After onboarding, confirm `setup.payments.stripe.status === 'active'`
      (not `pending`/`disabled`) via `stripeConnectApi.status()`.
- [ ] Confirm the Stripe account id got indexed:
      `tenantRegistry.resolveSlugByStripeAccountId(accountId)` should
      resolve back to this tenant. This happens automatically inside
      `updateStripeConnect()` (called after onboarding) — it's how the
      webhook route resolves tenant context from a Stripe account id
      alone, since webhooks arrive on a fixed platform host with no
      tenant domain to resolve from.
- [ ] Send one **test-mode booking** through Stripe checkout end-to-end:
      checkout session creation → webhook delivery
      (`checkout.session.completed` + `payment_intent.succeeded`) →
      booking confirmed → confirmation email sent.

## 7. Uploads directory — automatic

`config.uploads.path` is a tenant-aware getter; the directory
(`<dataRoot>/<slug>/uploads`) is created on first upload via
`fs.mkdir(..., { recursive: true })`.

- [ ] Confirm a test upload (e.g. the logo from step 5) lands in the
      correct tenant-scoped directory and is servable, unauthenticated,
      at `https://<tenant-domain>/uploads/<filename>`.

## 8. DNS / hosting

- [ ] Point the domain(s) from step 0/1 at the app's hosting.
- [ ] Confirm TLS certificate coverage if it's a custom domain rather than
      a subdomain already covered by an existing wildcard certificate.
- [ ] ⚠️ Exact hosting details (Fly.io app config, wildcard vs. per-domain
      cert) not yet confirmed against actual deployment config — fill in
      once available.

## 9. Content setup

- [ ] At least one **theater**, with a **layout** assigned.
- [ ] At least one **event** + **performance**.
- [ ] A test booking (use `free`/`cash` first to avoid needing live Stripe)
      completes end-to-end, seat map renders correctly.

## 10. Final smoke test

- [ ] Public booking page loads at the tenant's domain, unauthenticated,
      correct branding.
- [ ] Login works for both seeded accounts.
- [ ] Booking → confirmation email arrives, correctly branded, correct
      timezone in timestamps.
- [ ] QR scan and manual "mark as used" both work.
- [ ] Cancellation releases the seat.
- [ ] (If Stripe) one real test-mode payment confirms via webhook.

---

## When do we need a genuinely separate secret per tenant?

Most secrets are intentionally **shared** across all tenants:

- `JWT_SECRET` — verifies your own backend's tokens, not tenant-specific.
- Stripe **platform** secret key / webhook secrets — one platform account
  operates across all tenants' *connected* accounts via destination
  charges; each tenant's own Stripe identity is just the `accountId`
  stored in their `setup`, indexed at runtime (step 6) — not a separate
  secret key.
- `RESEND_API_KEY` — shared sending infrastructure.
- `INTERNAL_ADMIN_TOKEN` — protects the `/internal/tenants/reload` route
  platform-wide, not per tenant.

A new per-tenant secret is only needed if a tenant requires something
architecturally different — e.g. their own outbound SMTP domain instead
of the shared `no-reply@ticketuno.farmatime.it`, or their own OAuth app
credentials. If that need arises, extend the existing `_<SLUG>` env var
suffix convention (step 3) for just that one value — don't create a
separate `.env` file per tenant.

---

## Remaining open items

- [ ] Confirm intended use (or remove) of `TenantEntry.stripeAccountId` in
      `tenants.json` — currently written nowhere, read nowhere.
- [ ] Confirm `createConnectedAccount` vs. `createPlatformConnectedAccount`
      — which the onboarding UI actually calls.
- [ ] Document exact DNS/hosting steps for the current deployment target.
- [ ] Confirm env var slug transform (hyphens → underscores, uppercase)
      is applied consistently wherever `<SLUG>`-suffixed vars are looked
      up, given `tenants.json` slugs may contain hyphens.
      