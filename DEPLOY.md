# TicketUno Deployment Guide

## Prerequisites

1. Node.js 18+
2. Fly.io account (free tier OK)
3. Git

## First-Time Setup
```bash
# 1. Install all dependencies
npm run install:all

# 2. Setup Fly.io (installs CLI, creates .env)
npm run setup:fly

# 3. Review .env file and update if needed
nano .env

# 4. Deploy!
npm run deploy
```

## Environment Variables

Create `.env` in root:
```bash
NODE_ENV=production
PORT=8080
JWT_SECRET=your-super-secret-jwt-key-change-this
ADMIN_USER_EMAIL=your-admin-email-change-this
ADMIN_USER_PASSWORD=your-admin-password-change-this
DB_PATH=/data/ticketuno.db
REACT_APP_API_URL=https://ticketuno.fly.dev/api
```

## Useful Commands
```bash
npm run deploy          # Deploy to Fly.io
npm run logs            # View live logs
npm run status          # Check app status
npm run ssh             # SSH into container
npm run db:backup       # Backup database
```

## Manual Deployment Steps

If automated script fails:
```bash
# 1. Login to Fly.io
fly auth login

# 2. Create app (first time only)
fly apps create ticketuno --org personal
fly volumes create ticketuno_data --region fra --size 1

# 3. Set secrets
cat .env | fly secrets import --app ticketuno

# 4. Deploy
fly deploy --app ticketuno

# 5. Check status
fly status --app ticketuno
```

## Database Migrations

Migrations run automatically on startup. To add a new migration:

1. Create `backend/src/db/migrations/00X_description.sql`
2. Write SQL changes
3. Deploy - it will auto-apply

## Troubleshooting

**App won't start:**
```bash
fly logs --app ticketuno
```

**Database issues:**
```bash
fly ssh console --app ticketuno
ls -la /data/
sqlite3 /data/ticketuno.db ".tables"
```

**Reset database:**
```bash
fly ssh console --app ticketuno
rm /data/ticketuno.db
# Restart app
fly apps restart ticketuno
```

## Production URLs

- App: https://ticketuno.fly.dev
- Health: https://ticketuno.fly.dev/api/v1/health
- API: https://ticketuno.fly.dev/api

## Free Tier Limits

- 256MB RAM
- Shared CPU
- 1GB persistent storage
- Auto-sleep after inactivity (first request wakes it up)

## Monitoring

Use Fly.io dashboard: https://fly.io/dashboard
