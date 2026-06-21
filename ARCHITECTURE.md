┌─────────────────────────────────────────────────────────────┐
│                    TicketUno Multi-Tenant                   │
├─────────────────────────────────────────────────────────────┤
│  Tenant A (SQLite) │ Tenant B (SQLite) │ Tenant C (SQLite)  │
│  - Organizer ID    │ - Organizer ID    │ - Organizer ID     │
│  - Stripe account  │ - Stripe account  │ - Stripe account   │
└─────────────────────────────────────────────────────────────┘
                              │
                    ┌─────────▼─────────┐
                    │   Stripe Connect  │
                    │   (Platform)      │
                    └─────────┬─────────┘
                              │
                    ┌─────────▼─────────┐
                    │   End Customer    │
                    │   (Buyer)         │
                    └───────────────────┘