#!/usr/bin/env bash
#
# Stops Fly.io app, downloads database, lets you edit it, then uploads it back and restarts app

APP_NAME="ticketuno"
REMOTE_DB="/data/ticketuno.db"
LOCAL_DB="/tmp/ticketuno-production.db"

set -e

safe=false
while [[ $# -gt 0 ]]; do
  case "$1" in
    -s|--safe)
      safe=true
      shift
      ;;
    --)
      shift
      break
      ;;
    -*)
      echo "Unknown option: $1" >&2
      exit 1
      ;;
    *)
      # first non-option argument
      break
      ;;
  esac
done


if $safe; then
  echo "🔒 Enabling maintenance mode..."
  fly secrets set MAINTENANCE_MODE=1 -a "$APP_NAME" > /dev/null 2>&1
fi

echo "▶️  Restarting Fly.io machine..."
fly machine stop $(fly machine list -a "$APP_NAME" --json | jq -r '.[0].id') -a "$APP_NAME" #> /dev/null 2>&1
sleep 3
#echo "▶️  Starting Fly.io machine..."
fly machine start $(fly machine list -a "$APP_NAME" --json | jq -r '.[0].id') -a "$APP_NAME" #> /dev/null 2>&1

echo "⬇️  Downloading database from Fly.io..."
rm -f "$LOCAL_DB"
fly ssh sftp get "$REMOTE_DB" "$LOCAL_DB" -a "$APP_NAME" > /dev/null 2>&1

if [ ! -f "$LOCAL_DB" ]; then
  echo "❌  Failed to download database!"
  exit 1
fi
#echo "💾 Database downloaded locally at $LOCAL_DB"

echo "☩  Calculating signature of database before changes..."
OLD_HASH=$(sha256sum "$LOCAL_DB" | awk '{print $1}')

echo "✏️  Editing the database manually with your SQLite client"
sqlitebrowser "$LOCAL_DB" 2> /dev/null

echo "☩  Calculating signature of database after changes..."
NEW_HASH=$(sha256sum "$LOCAL_DB" | awk '{print $1}')

if [ "$OLD_HASH" != "$NEW_HASH" ]; then
  read -p "Do you want to sync back database to Fly.io? (y/N): " -n 1 -r
  echo
  if [[ $REPLY =~ ^[Yy]$ ]]; then # Proceed with action
    echo "⬆️  Uploading database back to Fly.io..."
    fly ssh sftp put "$LOCAL_DB" "$REMOTE_DB.new" -a "$APP_NAME"
    fly ssh console -a "$APP_NAME" --command "sh -c 'mv \"$REMOTE_DB\" \"$REMOTE_DB.bak\" && mv \"$REMOTE_DB.new\" \"$REMOTE_DB\" && chown node:node \"$REMOTE_DB\" && chmod 660 \"$REMOTE_DB\"'"

    #echo "▶️  Restarting Fly.io web service..."
    #fly scale count 1 -a $APP_NAME

    echo "✅  Database sync complete!"
  fi
else
  echo "   No changes to database"
fi

if $safe; then
  echo "🔓 Disabling maintenance mode..."
  fly secrets unset MAINTENANCE_MODE -a "$APP_NAME" > /dev/null 2>&1
fi

rm -f "$LOCAL_DB" "$LOCAL_DB.sha256"
exit 0
