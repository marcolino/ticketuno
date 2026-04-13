# TicketUno — Documentation

## Table of Contents

1. [Database Schema](#database-schema)
2. [Guard System](#guard-system)
3. [Seat Layout System](#seat-layout-system)
4. [Booking Flow](#booking-flow)
5. [PDF Ticket Generation](#pdf-ticket-generation)
6. [Email Templates](#email-templates)
7. [Authentication & Roles](#authentication--roles)
8. [i18n](#i18n)
9. [PWA](#pwa)
10. [Shared Module](#shared-module)

---

## Database Schema

All database access is centralized in `backend/src/db/database.ts`. The database uses SQLite and migrations run automatically on startup.

See `MIGRATIONS.md` for the full migration history.

### `users`

| Column | Type | Notes |
|--------|------|-------|
| `id` | INTEGER PK |  |
| `email` | TEXT UNIQUE NOT NULL |  |
| `password_hash` | TEXT NOT NULL | bcrypt |
| `role` | TEXT NOT NULL | `admin` \| `manager` \| `staff` |
| `name` | TEXT |  |
| `created_at` | TEXT | UTC ISO timestamp |

### `theaters`

| Column | Type | Notes |
|--------|------|-------|
| `id` | INTEGER PK |  |
| `name` | TEXT NOT NULL |  |
| `address` | TEXT |  |
| `phone` | TEXT |  |
| `email` | TEXT |  |
| `website` | TEXT |  |
| `description` | TEXT |  |
| `created_at` | TEXT |  |

### `layouts`

A layout defines the physical seat arrangement for a theater. One theater can have multiple layouts (e.g., for different stage configurations).

| Column | Type | Notes |
|--------|------|-------|
| `id` | INTEGER PK |  |
| `theater_id` | INTEGER FK → theaters |  |
| `name` | TEXT NOT NULL |  |
| `data` | TEXT NOT NULL | JSON blob — array of seat rows |
| `created_at` | TEXT |  |

The `data` column stores a serialized `Layout` object (see `shared/types/layout.ts`). Each seat has: `id`, `row`, `number`, `condition` (`normal` \| `wheelchair` \| `hazard` \| `restricted_view` \| `staff` \| `family`), and display numbering metadata.

### `events`

| Column | Type | Notes |
|--------|------|-------|
| `id` | INTEGER PK |  |
| `theater_id` | INTEGER FK → theaters |  |
| `layout_id` | INTEGER FK → layouts |  |
| `title` | TEXT NOT NULL |  |
| `description` | TEXT |  |
| `poster_path` | TEXT | Relative path to uploaded image |
| `cast` | TEXT | JSON array of cast member strings |
| `created_at` | TEXT |  |

### `performances`

| Column | Type | Notes |
|--------|------|-------|
| `id` | INTEGER PK |  |
| `event_id` | INTEGER FK → events |  |
| `datetime` | TEXT NOT NULL | UTC ISO string |
| `deleted_at` | TEXT | Non-null = soft-deleted / cancelled. **Sole cancellation marker.** |
| `created_at` | TEXT |  |

> **Important:** `deleted_at` is the only field that determines whether a performance is cancelled. There is no `status` column.

### `seats`

One row per seat per performance — generated from the layout when a performance is created.

| Column | Type | Notes |
|--------|------|-------|
| `id` | INTEGER PK |  |
| `performance_id` | INTEGER FK → performances |  |
| `seat_id` | TEXT NOT NULL | Compound ID: `{rowId}_{seatNumber}` |
| `display_number` | INTEGER | Display number calculated post-booking from layout |
| `condition` | TEXT | Mirrors layout condition at time of performance creation |
| `booking_ref` | TEXT | Nullable — one booking ref per seat (not per order) |
| `booked_at` | TEXT | UTC timestamp of booking |

---

## Guard System

The guard system prevents destructive actions (delete theater/event/performance, change layout) when active bookings exist.

### Flow

1. Before executing a destructive DB operation, `database.ts` calls `queryActiveBookings(entityType, id)`.
2. If bookings exist, the operation is aborted and a `GuardResult` is returned instead.
3. Route handlers always respond HTTP 200, returning either the success payload or a `GuardResult`.
4. The frontend inspects the response for a `guardReason` field and renders `<ActiveBookingsWarning>` accordingly.

### Types (`shared/types/guard.ts`)

```typescript
type GuardReason =
  | 'theater_has_active_bookings'
  | 'event_has_active_bookings'
  | 'performance_has_active_bookings'
  | 'layout_has_active_bookings';

interface GuardResult {
  guarded: true;
  guardReason: GuardReason;
  activeBookingCount: number;
}
```

### Why always-200?

Guard responses are not errors — they are expected business outcomes. Using 4xx would trigger generic error handling in fetch clients. Always-200 with a typed payload keeps the frontend in full control of the UX.

---

## Seat Layout System

### Layout Editor (`LayoutEdit.tsx`)

- Admins build layouts visually by adding rows and seats.
- Each seat can be assigned a **condition**: `normal`, `wheelchair`, `hazard`, `restricted_view`, `staff`, `family`.
- Condition icons and colors are defined in `LayoutSeat.tsx` (`CONDITION_COLORS`) — single source of truth.
- Mobile touch support uses `@media (hover: hover) and (pointer: fine)` + `:active` for hover-only effects.

### Layout → Seats conversion

`shared/utils/layoutToSeats.ts` converts a `Layout` JSON blob into a flat array of `Seat` objects. This is called:
- When a performance is created (to populate the `seats` table)
- When the frontend renders the booking seat map

### Display Numbering

Seat display numbers are calculated from the layout *after* booking, in `backend/src/routes/events.ts`, by calling `applyDisplayNumbers(layout, seats)`. This ensures display numbers always reflect the current layout even if the layout was edited after initial seat creation.

### Seat Icons

Condition-specific icons are rendered as inline JSX (not as `<g>` sub-components) inside `SeatMiniSVG.tsx`. SVG sub-components inside `<g>` are unreliable in React — always inline the JSX.

---

## Booking Flow

1. User visits a performance and sees the seat map (`PerformanceBooking.tsx`).
2. User selects available seats and submits the booking form.
3. `POST /api/performances/:id/book` validates seat availability, writes to `seats` (setting `booking_ref`), and returns a `BookingRef`.
4. Backend sends a confirmation email via `emailService.ts`.
5. User can download a PDF ticket via `GET /api/bookings/:ref/ticket`.

### Cancellation

A booking is cancelled by clearing `booking_ref` and `booked_at` on the affected seat rows. A performance is cancelled by setting `performances.deleted_at`.

---

## PDF Ticket Generation

Implemented in `backend/src/services/ticketService.ts` using **PDFKit** and **QRCode**.

### Key design decisions

- Poster image loaded from local filesystem path (`fs.readFile`) — not fetched from URL.
- `parseSeat(seatId)` splits compound seat IDs (`{rowId}_{seatNumber}`) into row + number for display.
- Six variably-weighted booking info chips laid out horizontally.
- Three-column venue/cast row with conditional centre column.
- Open Sans embedded via `.ttf` files in `backend/src/assets/`.
- `bookingIsPaid` and `useQrcode` boolean flags control optional sections (backward-compatible defaults: `false`).

---

## Email Templates

Booking confirmation emails are built from **MJML** templates in `backend/src/templates/`, compiled to HTML at send time, and delivered via **nodemailer**.

### Key rules for email templates

- Use a **system font stack** (not Google Fonts) — Gmail on Android/Ubuntu strips external font imports.
- Style `<td>` elements with **inline `style=""`** attributes — email clients strip CSS classes from table cells.
- Use **Handlebars** conditionals for optional sections: `{{#if bookingIsPaid}}`, `{{#if qrcodeIsPresent}}`.

### Extracting i18n keys from templates

```bash
node scripts/extract-mjml-keys.js
```

---

## Authentication & Roles

### JWT

- Login: `POST /api/auth/login` → returns a signed JWT.
- All protected routes use the `authHandler()` wrapper + `auth.ts` middleware, which attaches the decoded payload to `req.user` (typed as `AuthRequest` from `shared/types/auth.ts`).
- `AuthRequest` extends Express's `Request` — **not** the Fetch API `Request`.

### Roles

Defined in `shared/types/auth.ts`: `admin` | `manager` | `staff`.

Role-based permission checks use helpers from `shared/utils/roles.ts` (e.g., `userCanManageAccount`). **Always check this file before adding new permission logic** — avoid duplicating role logic across the codebase.

---

## i18n

- Translations live in `shared/locales/{en,it,fr,zh}/`.
- The frontend uses **react-i18next**; the backend uses **i18next** directly.
- Both are bootstrapped from a shared `i18next.config.js` at the repo root.
- Supported languages: **English**, **Italian**, **French**, **Chinese**.

### Tooling

| Script | Purpose |
|--------|---------|
| `cd frontend && npm run i18n:status` | Report missing/extra keys per locale |
| `node scripts/translate.js` | Auto-fill missing keys using a translation API |
| `node scripts/extract-mjml-keys.js` | Sync i18n keys from MJML email templates |

---

## PWA

The frontend is a Progressive Web App:

- **Service worker** (`frontend/src/sw.ts`) handles offline caching and background sync.
- **Web manifest** (`frontend/public/manifest.json`) enables install-to-home-screen.
- **Icons** in `frontend/public/icons/` generated via `scripts/generate-pwa-assets.js`.

The Vite PWA plugin is configured in `frontend/vite.config.js`.

---

## Shared Module

`/shared` is the monorepo's shared TypeScript package. It is **not published to npm** — instead, it is symlinked directly:

```
backend/src/shared  →  ../../shared
frontend/src/shared →  ../../shared
```

This means any change to a file in `/shared` is immediately reflected in both the frontend and backend without any build or publish step.

### What lives in shared

| Path | Contents |
|------|----------|
| `shared/types/` | All TypeScript interfaces used across frontend and backend |
| `shared/utils/roles.ts` | Role permission helpers — **single source of truth** |
| `shared/utils/layoutToSeats.ts` | Layout → flat seat array conversion |
| `shared/utils/misc.ts` | General utility functions |
| `shared/locales/` | i18n JSON translation files |
| `shared/config.ts` | Constants shared by both sides |

### Rule

If you find yourself duplicating a type or utility between frontend and backend, move it to `shared/` instead.
