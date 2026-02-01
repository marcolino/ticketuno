#!/bin/bash
#
# Deploy app to Fly.io

set -e

APP_NAME="ticketuno"
REGIONS="fra"

echo "🚀 Deploying app \"$APP_NAME\" to Fly.io..."

# Check if the folder name is the same as APP_NAME
if [ "`basename \"$PWD\"`" != "$APP_NAME" ]; then
  echo "❌ Current directory is `basename \"$PWD\"`, not $APP_NAME ..."
  exit 1
fi

# Check if fly CLI is installed
if ! command -v fly &> /dev/null; then
  echo "❌ Fly CLI not found. Install it: https://fly.io/docs/hands-on/install-flyctl/"
  exit 2
fi

# Check if logged in
if ! fly auth whoami &> /dev/null; then
  echo "❌ Not logged in to Fly.io. Run: fly auth login"
  exit 3
fi

# Check if .env exists
if [ ! -f .env ]; then
  echo "❌ .env file not found. Create it from .env.example"
  exit 4
fi

# Run pre-deploy checks
echo "🔍 Running pre-deploy checks..."
npm run type-check > /dev/null || {
  echo "❌ TypeScript check failed. Fix errors before deploying."
  exit 5
}

# Check if app exists, create if not
if ! fly apps list | grep -q "^$APP_NAME"; then
  echo "📦 Creating new Fly.io app..."
  fly apps create $APP_NAME --org personal
  
  echo "💾 Creating persistent volume..."
  fly volumes create ticketuno_data --regions $REGIONS --size 1 --app $APP_NAME
fi

# Import secrets from .env
echo "🔐 Importing secrets..."
cat .env | fly secrets import --app $APP_NAME

# Deploy
echo "🏗️  Building and deploying..."
fly deploy --app $APP_NAME --regions $REGIONS

echo "✅ Deploy complete!"
echo "🌐 Your app is available at: https://$APP_NAME.fly.dev"
echo ""
echo "Useful commands:"
echo "  fly logs --app $APP_NAME         - View logs"
echo "  fly ssh console --app $APP_NAME  - SSH into container"
echo "  fly status --app $APP_NAME       - Check status"

exit 0
