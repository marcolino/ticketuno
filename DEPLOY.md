# TicketUno — Deployment Guide

The app is deployed as a single Docker container on [Fly.io](https://fly.io). The multi-stage `Dockerfile` builds the frontend (Vite), then serves it statically via the Express backend.

---

## Prerequisites

- Node.js 18+
- [Fly.io CLI](https://fly.io/docs/hands-on/install-flyctl/) (`flyctl`)
- A Fly.io account (free tier is sufficient)
- Docker (for local image testing, optional)

---

## First-Time Setup

```bash
# 1. Install all dependencies
npm run install:all

# 2. Login to Fly.io
fly auth login

# 3. Create the app and persistent volume (first time only)
fly apps create ticketuno --org personal
fly volumes create ticketuno_data --region fra --size 1

# 4. Configure environment variables
cp .env.example .env
# Edit .env — see variables below

# 5. Push secrets to Fly.io
cat .env | fly secrets import --app ticketuno

# 6. Deploy
npm run deploy
```

---

## Environment Variables

Create `.env` in the **repo root**:

```env
JWT_SECRET=your-jwt-secret-change-this-in-production
PASSEPARTOUT=your-passepartout-password-change-this-in-production
ADMIN_USER_EMAIL=admin@mail.com
ADMIN_USER_PASSWORD=your-admin-password-change-this-in-production
OPERATOR_USER_EMAIL=operator@mail.com
OPERATOR_USER_PASSWORD=your-operator-password-change-this-in-production
EMAIL_TOKEN_SECRET=your-token-secret-for-email-unsubscribe-change-this-in-production
GOOGLE_CLIENT_ID=your-google-client-id-for-google-oauth
GOOGLE_CLIENT_SECRET=your-google-client-secret-for-google-oauth
TICKET_HMAC_SECRET=your-hmac-secret-for-qrcodes-encryption
RESEND_API_KEY=your-resend-api-key-for-emails
GEMINI_API_KEY=your-gemini-api-key-for-translations
GROQ_API_KEY=your-grok-api-key-for-translations
SLACK_WEBHOOK_TOKEN=your-slack-webhook-token
MAINTENANCE_MODE=0
```

---

## Deployment Scripts

| Command | Description |
|---------|-------------|
| `npm run deploy` | Build frontend + deploy to Fly.io |
| `npm run logs` | Stream live logs from the running container |
| `npm run status` | Check app and VM status |
| `npm run ssh` | SSH into the running container |
| `npm run db:backup` | Download a backup of the production SQLite database |
| `npm run rollback` | Roll back to the previous deployment |

These wrap the scripts in `scripts/deploy.sh`, `scripts/rollback.sh`, etc.

---

## Manual Deployment Steps

If the automated script fails:

```bash
# 1. Build the frontend
cd frontend && npm run build && cd ..

# 2. Build the backend
cd backend && npm run build && cd ..

# 3. Deploy to Fly.io
fly deploy --app ticketuno

# 4. Check status
fly status --app ticketuno
```

---

## Database Migrations

Migrations run automatically on every startup. Migration files live in `backend/src/db/`. See `MIGRATIONS.md` for the full migration log.

To add a new migration, add the SQL to the migration runner in `database.ts` following the existing pattern — each migration is guarded by a version check so it only runs once.

---

## Syncing the Production Database Locally

```bash
npm run db:sync
# or directly:
bash scripts/db-sync.sh
```

This pulls the production SQLite file into `data/ticketuno.db`.

> ⚠️ This overwrites your local database.

---

## Troubleshooting

**App won't start**
```bash
fly logs --app ticketuno
```

**Database issues**
```bash
fly ssh console --app ticketuno
ls -la /data/
sqlite3 /data/ticketuno.db ".tables"
```

**Reset the production database** ⚠️ Destructive — all data will be lost
```bash
fly ssh console --app ticketuno
rm /data/ticketuno.db
fly apps restart ticketuno
```

**Container health check**
```bash
curl https://ticketuno.fly.dev/api/v1/health
```

---

## Production URLs

| Resource | URL |
|----------|-----|
| App | https://ticketuno.fly.dev |
| API root | https://ticketuno.fly.dev/api |
| Health check | https://ticketuno.fly.dev/api/v1/health |
| Fly.io dashboard | https://fly.io/dashboard |

---

## Fly.io Free Tier Notes

- 256 MB RAM, shared CPU
- 1 GB persistent storage (the Fly volume holds the SQLite DB and uploaded posters)
- Auto-sleep after inactivity — first request after sleep may be slow (~2–5 s cold start)
- Scale up: `fly scale memory 512 --app ticketuno`
