#!/usr/bin/env bash
#
# Destroys a Fly.io machine and attached volume.

APP_NAME="${1:-ticketuno}"

set -e

echo "📃 Listing machines and volumes..."
MACHINE_ID=$(fly machine list -a "$APP_NAME" --json | jq -r '.[0].id')
if [ -z "$MACHINE_ID" -o "$MACHINE_ID" = "null" ]; then
  echo "No machine found for app ${APP_NAME}"
  exit 1
fi
VOLUME_ID=$(fly volumes list -a "$APP_NAME" --json | jq -r '.[0].id')
if [ -z "$VOLUME_ID" ]; then
  echo "No volume found for app ${APP_NAME}"
  exit 2
fi

echo -ne "\
Are you sure you want to 💣 destroy machine ${MACHINE_ID} of app ${APP_NAME} 
and attached volume ${VOLUME_ID} ? [y/N] \
"
read answer
if [ "$answer" != "Y" -a "$answer" != "y" ]; then
  exit 0
fi

echo "💣 Destroy the machine..."
fly machine destroy "${MACHINE_ID}" -a "$APP_NAME" --yes
echo "💣 Destroy the volume..."
fly volumes destroy "${VOLUME_ID}" -a "$APP_NAME" --yes

echo "machine and volume destroyed; you can deploy now"
exit 0
