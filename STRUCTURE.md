ticketuno/
│
├── backend/
│   ├── src/
│   │   ├── server.ts               # Express app entry point
│   │   ├── config.ts               # Runtime config (env vars)
│   │   ├── i18n.ts                 # Backend i18n bootstrap
│   │   │
│   │   ├── db/
│   │   │   └── database.ts         # SQLite wrapper — all DB access goes here
│   │   │                           # Includes guard queries, migrations, transactions
│   │   │
│   │   ├── middleware/
│   │   │   └── auth.ts             # JWT verification middleware (authHandler)
│   │   │
│   │   ├── routes/
│   │   │   ├── auth.ts             # POST /api/auth/login
│   │   │   ├── theaters.ts         # Theater CRUD + seat map
│   │   │   ├── events.ts           # Event CRUD, seat display numbering
│   │   │   ├── performances.ts     # Performance CRUD + cancellation
│   │   │   ├── layouts.ts          # Seat layout CRUD
│   │   │   ├── bookings.ts         # Booking creation, cancellation
│   │   │   ├── users.ts            # User management (admin)
│   │   │   └── ...
│   │   │
│   │   ├── services/
│   │   │   ├── ticketService.ts    # PDF ticket generation (PDFKit + QRCode)
│   │   │   └── emailService.ts     # Booking confirmation emails (MJML → HTML → nodemailer)
│   │   │
│   │   ├── templates/              # MJML email templates (Handlebars variables)
│   │   │
│   │   ├── assets/                 # Static assets embedded in PDFs (fonts, logo)
│   │   │
│   │   ├── utils/                  # Backend-only utility functions
│   │   │
│   │   └── shared -> ../../shared  # Symlink to /shared (types + utils)
│   │
│   ├── package.json
│   └── tsconfig.json
│
├── frontend/
│   ├── index.html                  # Vite entry HTML
│   ├── vite.config.js              # Vite config (PWA plugin, proxy)
│   ├── eslint.config.js
│   │
│   ├── public/
│   │   ├── icons/                  # PWA icons
│   │   ├── images/
│   │   ├── manifest.json           # Web app manifest
│   │   └── maintenance.html        # Static maintenance page
│   │
│   ├── src/
│   │   ├── index.tsx               # React root
│   │   ├── App.tsx                 # App shell, providers
│   │   ├── Routes.tsx              # React Router routes + nav guards
│   │   ├── config.ts               # Frontend runtime config (VITE_ env vars)
│   │   ├── i18n.ts                 # i18next setup (react-i18next)
│   │   │
│   │   ├── components/             # Feature and UI components
│   │   │   ├── TheatersList.tsx
│   │   │   ├── TheaterEdit.tsx     # Theater form (react-phone-input-2 + MUI)
│   │   │   ├── EventList.tsx
│   │   │   ├── EventEdit.tsx       # Event form + poster upload
│   │   │   ├── PerformanceList.tsx
│   │   │   ├── PerformanceBooking.tsx  # Public booking flow + seat map
│   │   │   ├── LayoutEdit.tsx      # Visual seat layout editor
│   │   │   ├── LayoutSeat.tsx      # Individual seat (condition icons, colors)
│   │   │   ├── LayoutLegend.tsx    # Seat condition legend
│   │   │   ├── LayoutPreviewSVG.tsx# Compact SVG layout preview
│   │   │   ├── SeatMiniSVG.tsx     # Shared inline SVG seat icon component
│   │   │   ├── SeatMarkingToolbar.tsx
│   │   │   ├── UsersList.tsx       # Admin user list + bulk delete
│   │   │   ├── ActiveBookingsWarning.tsx  # MUI guard warning component
│   │   │   └── ...
│   │   │
│   │   ├── contexts/
│   │   │   ├── AuthContext.tsx     # JWT auth state
│   │   │   └── DialogContext.tsx   # Global confirm/alert dialogs (Promise<boolean>)
│   │   │
│   │   ├── hooks/                  # Custom React hooks
│   │   ├── services/               # API client (fetch wrappers per resource)
│   │   ├── theme/                  # MUI theme definition
│   │   ├── utils/                  # Frontend utility functions
│   │   ├── pwa/                    # PWA install prompt, update logic
│   │   └── shared -> ../../shared  # Symlink to /shared (types + utils)
│   │
│   ├── scripts/
│   │   └── i18n-status             # CLI tool: reports translation key coverage
│   │
│   ├── package.json
│   ├── tsconfig.json
│   └── vite-env.d.ts
│
├── shared/                         # Shared code — consumed by both frontend and backend via symlink
│   ├── config.ts                   # Shared runtime constants
│   │
│   ├── types/                      # TypeScript interfaces and unions
│   │   ├── auth.ts                 # AuthRequest, JWT payload, roles
│   │   ├── booking.ts              # Booking, BookingRef, GuardedDeleteResultBulk
│   │   ├── config.ts               # Shared config shape
│   │   ├── consent.ts
│   │   ├── dialog.ts               # DialogOptions (lives only here)
│   │   ├── email.ts                # Email template data shapes
│   │   ├── event.ts
│   │   ├── generalSetup.ts
│   │   ├── guard.ts                # GuardReason union, guard result types
│   │   ├── image.ts
│   │   ├── layout.ts               # Layout, LayoutSeat, SeatCondition
│   │   ├── layoutToSeats.ts
│   │   ├── performance.ts          # Performance, PerformanceQueryOptions
│   │   ├── query.ts                # EventQueryOptions, pastToo/canceledToo flags
│   │   ├── seat.ts                 # Seat, booking_ref
│   │   ├── theater.ts
│   │   ├── theme.ts
│   │   ├── ticket.ts               # Ticket/PDF generation options
│   │   └── user.ts                 # User, role types
│   │
│   ├── utils/
│   │   ├── roles.ts                # userCanManageAccount and other role helpers
│   │   ├── layoutToSeats.ts        # Layout → seat array conversion
│   │   └── misc.ts
│   │
│   └── locales/                    # i18n translation files
│       ├── en/
│       ├── it/
│       ├── fr/
│       └── zh/
│
├── data/                           # Runtime data (gitignored)
│   ├── ticketuno.db                # SQLite database
│   └── uploads/                   # Uploaded poster images (hashed filenames)
│
├── scripts/                        # Dev and ops scripts
│   ├── deploy.sh                   # Build + fly deploy
│   ├── rollback.sh                 # Fly.io rollback
│   ├── db-sync.sh                  # Pull production DB locally
│   ├── db-destroy.sh               # Wipe local DB
│   ├── translate.js                # Auto-translate missing i18n keys
│   ├── extract-mjml-keys.js        # Extract i18n keys from MJML templates
│   ├── generate-pwa-assets.js      # Generate PWA icon sizes
│   └── generate-pwa-manifest.js    # Generate web manifest
│
├── dev/                            # Developer assets (not shipped)
│   ├── images/                     # Logo variants (PNG, SVG)
│   ├── screenshots/                # App screenshots
│   ├── sounds/                     # UI sound effects
│   └── pwa.json                    # PWA asset generation config
│
├── tests/
│   ├── backend/
│   └── frontend/
│
├── Dockerfile                      # Multi-stage: build frontend → serve via Express
├── fly.toml                        # Fly.io app config
├── package.json                    # Root workspace scripts (install:all, deploy, logs, …)
├── i18next.config.js               # Shared i18next config
├── LICENSE
├── README.md
├── STRUCTURE.md                    # This file
├── DOCUMENTATION.md                # DB schema + architectural notes
├── DEPLOY.md                       # Fly.io deployment guide
├── MIGRATIONS.md                   # Database migration log
└── TODO.md
