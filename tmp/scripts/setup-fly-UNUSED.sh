#!/bin/bash
#
# Setup Fly.io
set -e

APP_NAME="ticketuno"

echo "🎭 Setting up app \$APP_NAME on Fly.io..."

# Check fly CLI
if ! command -v fly &> /dev/null; then
  echo "❌ Fly CLI not found. Installing..."
  curl -L https://fly.io/install.sh | sh
  echo "✅ Fly CLI installed. Please run: export PATH=\$HOME/.fly/bin:\$PATH"
  exit 1
fi

# Login check
if ! fly auth whoami &> /dev/null; then
  echo "🔑 Please login to Fly.io..."
  fly auth login
fi

# Create .env if not exists
if [ ! -f .env ]; then
  echo "❌ .env file not found. Create it from .env.example"
  exit 2
#   echo "📝 Creating .env file from template..."
#   cp .env.example .env
  
#   # Generate secure secrets
#   JWT_SECRET=$(openssl rand -base64 32)
#   ADMIN_PASSWORD=$(openssl rand -base64 16)
  
#   sed -i.bak "s|JWT_SECRET=.*|JWT_SECRET=$JWT_SECRET|" .env
#   sed -i.bak "s|ADMIN_PASSWORD=.*|ADMIN_PASSWORD=$ADMIN_PASSWORD|" .env
#   rm .env.bak
  
#   echo "✅ .env created with secure secrets"
#   echo "⚠️  Please review and update .env file before deploying"
fi

echo ""
echo "✅ Setup complete!"
echo ""
echo "Next steps:"
echo "  1. Review and update .env file"
echo "  2. Run: npm run deploy"

exit 0
