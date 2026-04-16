# TicketUno

A full-stack theater seat reservation system built with React, Node.js, and SQLite — designed for small to medium theater companies that need to manage venues, events, performances, and ticket bookings.

> Deployed on [Fly.io](https://fly.io) · React + MUI frontend · Express + TypeScript backend · SQLite database

---

## Features

**Public**
- Theater and event browsing
- Poster image upload (and editing) per event
- Interactive seat map with real-time availability
- Online seat booking with booking reference generation
- PDF ticket download with QR code
- Booking confirmation email (HTML via MJML templates)
- Multi-language UI: English, Italian, French, Chinese

**Private**
- Theater, layout, event, and performance management
- Visual seat layout editor with condition markers (wheelchair, hazard, restricted view, staff, family)
- Role-based access control (admin, operator, user)
- Bulk user management with guarded destructive actions
- Guard system: blocks editing/deletions of theaters, events, performances, or layout changes
  when active bookings exist
- i18n status tooling and translation scripts

**Technical**
- PWA-ready (service worker, web manifest, installable)
- Monorepo with a `shared/` module symlinked into both frontend and backend
- Fully typed end-to-end with TypeScript shared types
- SQLite with automatic migrations on startup

---

## Repository Structure

```
ticketuno/
├── backend/            # Express + TypeScript API server
│   └── src/
│       ├── config.ts
│       ├── server.ts
│       ├── db/         # database.ts wrapper + migrations
│       ├── middleware/ # auth (JWT), error handling
│       ├── routes/     # theaters, events, performances, layouts, bookings, users, …
│       ├── services/   # ticketService (PDF), emailService (MJML)
│       ├── i18n/       # backend i18n setup
│       ├── templates/  # MJML email templates
│       ├── assets/     # fonts, static assets for PDF generation
│       └── utils/
├── frontend/           # React + Vite + MUI SPA
│   └── src/
│       ├── App.tsx
│       ├── Routes.tsx
│       ├── components/ # page and UI components
│       ├── contexts/   # DialogContext, AuthContext, …
│       ├── hooks/
│       ├── services/   # API client
│       ├── theme/
│       ├── utils/
│       └── pwa/
├── shared/             # Shared TypeScript — symlinked into both frontend and backend
│   ├── types/          # auth, booking, event, layout, performance, seat, theater, user, guard, …
│   ├── utils/          # roles.ts, layoutToSeats.ts, misc.ts
│   ├── locales/        # i18n JSON (en, it, fr, zh)
│   └── config.ts
├── data/               # SQLite database + uploaded poster images (gitignored)
├── scripts/            # Dev and ops scripts (deploy, rollback, db-sync, translate, PWA gen)
├── dev/                # Logo assets, screenshots, PWA config
├── Dockerfile
├── fly.toml
├── package.json        # Root: workspace scripts
├── README.md
├── STRUCTURE.md
├── DOCUMENTATION.md
├── DEPLOY.md
└── MIGRATIONS.md
```

See [`STRUCTURE.md`](./STRUCTURE.md) for the full annotated tree.

---

## Quick Start

### Prerequisites

- Node.js 18+
- npm 9+

### 1. Install dependencies

```bash
npm run install:all
```

This installs root, backend, and frontend dependencies in one step.

### 2. Configure environment

```bash
cp .env.example .env
# Edit .env with your settings
```

Key variables (see full list in [`DEPLOY.md`](./DEPLOY.md)):

```env
JWT_SECRET=your-jwt-secret-change-this-in-production
PASSEPARTOUT=your-passepartout-password-change-this-in-production
ADMIN_USER_EMAIL=admin@mail.com
ADMIN_USER_PASSWORD=your-admin-password-change-this-in-production
OPERATOR_USER_EMAIL=operator@mail.com
OPERATOR_USER_PASSWORD=your-operator-password-change-this-in-production
MAINTENANCE_MODE=0
```

# Edit shared/config.ts with your settings
```bash
vi shared/config.ts
# Edit shared/config.ts with your settings
```

### 3. Run in development

```bash
# Backend (with hot reload)
cd backend && npm run dev # (or run your preferred debugger)

# Frontend (separate terminal)
cd frontend && npm run dev
```

Frontend runs on `http://localhost:3000`, backend on `http://localhost:3001`.

---

## API Overview

### Public endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/theaters` | List all theaters |
| `GET` | `/api/theaters/:id` | Theater detail |
| `GET` | `/api/events` | List public events |
| `GET` | `/api/events/:id/performances` | Performances for an event |
| `GET` | `/api/performances/:id/seats` | Seat availability |
| `POST` | `/api/performances/:id/book` | Book seats |
| `GET` | `/api/bookings/:ref/ticket` | Download PDF ticket |

### Protected endpoints (JWT required)

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/auth/login` | Admin login |
| `*` | `/api/theaters/*` | Theater CRUD |
| `*` | `/api/events/*` | Event CRUD |
| `*` | `/api/performances/*` | Performance CRUD |
| `*` | `/api/layouts/*` | Seat layout CRUD |
| `*` | `/api/users/*` | User management |

All protected routes return guard errors (HTTP 200 with a `GuardReason`) instead of 4xx when a destructive action is blocked by active bookings.

See [`DOCUMENTATION.md`](./DOCUMENTATION.md) for full API and database documentation.

---

## Deployment

See [`DEPLOY.md`](./DEPLOY.md) for full Fly.io deployment instructions.

```bash
npm run deploy      # Build and deploy to Fly.io
npm run logs        # Live log stream
npm run status      # App status
npm run db:backup   # Backup SQLite database
```

---

## i18n

Translations live in `shared/locales/{en,it,fr,zh}/`. To check coverage:

```bash
npm run i18n:status
```

To extract strings to be translated from the code:

```bash
npm run i18n:extract
```

To generate or update translations automatically:

```bash
npm run i18n:auto
```

---

## License

MIT — see [`LICENSE`](./LICENSE).
