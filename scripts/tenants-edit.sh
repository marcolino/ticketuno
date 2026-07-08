#!/usr/bin/env bash
#
# Edit tenants json 

APP_NAME="ticketuno"
APP_URL="https://ticketuno.fly.dev"
INTERNAL_ADMIN_TOKEN="`grep INTERNAL_ADMIN_TOKEN ./backend/.env | cut -d= -f2`"

fly ssh console --app "${APP_NAME}"
vi data/tenants.json

curl -X POST "${APP_URL}/internal/tenants/reload" \
  -H "x-internal-admin-token: ${INTERNAL_ADMIN_TOKEN}"