#!/usr/bin/env bash
#
# Deploy app to Fly.io
# Tags: backend-vX.Y.Z and frontend-vX.Y.Z are created independently,
#       only when changes are detected in the respective directory.

set -e

APP_NAME="ticketuno"
REGIONS="fra"
CACHE="true"   # Use "false" or "" to disable Docker layer cache
FORCE=false    # Use --force to deploy even with no detected changes

# Parse flags
for arg in "$@"; do
  case $arg in
    --force) FORCE=true ;;
    --no-cache) CACHE="false" ;;
  esac
done

# ─── Helpers ──────────────────────────────────────────────────────────────────

# Last tag for a component (e.g. "backend" → "backend-v1.0.23")
get_last_tag() {
  local component=$1
  git tag --list "${component}-v*" --sort=-version:refname | head -1
}

# Returns 0 (true) if the component directory changed since its last tag
has_changes() {
  local component=$1
  local last_tag
  last_tag=$(get_last_tag "$component")

  if [ -z "$last_tag" ]; then
    return 0  # No previous tag = first deploy, treat as changed
  fi

  # Also re-deploy if deploy.sh itself changed
  if ! git diff --quiet "${last_tag}" HEAD -- "${component}/" deploy.sh; then
    return 0  # Changed
  fi

  return 1  # No changes
}

# ─── Pre-flight checks ────────────────────────────────────────────────────────

echo "🚀 Deploying app \"${APP_NAME}\" to Fly.io..."

if [ "$(basename "${PWD}")" != "${APP_NAME}" ]; then
  echo "❌ Current directory is $(basename "${PWD}"), not ${APP_NAME}."
  exit 1
fi

if ! command -v fly &> /dev/null; then
  echo "❌ Fly CLI not found. Install it: https://fly.io/docs/hands-on/install-flyctl/"
  exit 2
fi

if ! fly auth whoami &> /dev/null; then
  echo "❌ Not logged in to Fly.io. Run: fly auth login"
  exit 3
fi

if [ ! -f "backend/.env" ]; then
  echo "❌ backend/.env not found. Create it from backend/.env.example"
  exit 4
fi

# Ensure clean state — we never want a tag pointing to uncommitted changes
if [ -n "$(git status --porcelain)" ]; then
  echo "❌ Working directory is dirty. Commit or stash changes before deploying."
  exit 5
fi

# ─── TypeScript check ─────────────────────────────────────────────────────────

echo "🔍 Running pre-deploy checks..."
npm run type-check > /dev/null || {
  echo "❌ TypeScript check failed. Fix errors before deploying."
  exit 6
}

# ─── Change detection ─────────────────────────────────────────────────────────

BACKEND_CHANGED=false
FRONTEND_CHANGED=false

has_changes "backend"  && BACKEND_CHANGED=true
has_changes "frontend" && FRONTEND_CHANGED=true

if [ "$BACKEND_CHANGED" = false ] && [ "$FRONTEND_CHANGED" = false ]; then
  if [ "$FORCE" = false ]; then
    echo ""
    echo "⚠️  No changes detected in backend or frontend since last deploy."
    echo "   Last tags:"
    echo "     $(get_last_tag backend  || echo 'backend:  none')"
    echo "     $(get_last_tag frontend || echo 'frontend: none')"
    echo ""
    echo "   Options:"
    echo "     ./deploy.sh --force          re-deploy without bumping versions"
    echo "     git commit --allow-empty ... add a marker commit, then re-run"
    exit 7
  else
    echo "⚠️  No changes detected, but --force was passed. Skipping version bumps."
  fi
else
  [ "$BACKEND_CHANGED"  = false ] && echo "⚠️  No changes in backend  — version will not be bumped."
  [ "$FRONTEND_CHANGED" = false ] && echo "⚠️  No changes in frontend — version will not be bumped."
fi

# ─── Read current versions ────────────────────────────────────────────────────

BACKEND_VERSION=$(node  -p "require('./backend/package.json').version")
FRONTEND_VERSION=$(node -p "require('./frontend/package.json').version")

# ─── Ensure app exists ────────────────────────────────────────────────────────

if ! fly apps list | grep -q "^${APP_NAME}"; then
  echo "📦 Creating new Fly.io app..."
  fly apps create "${APP_NAME}" --org personal

  echo "💾 Creating persistent volume..."
  fly volumes create ticketuno_data --regions "${REGIONS}" --size 1 --app "${APP_NAME}"
fi

# ─── Secrets ─────────────────────────────────────────────────────────────────

echo "🔐 Importing secrets..."
cat backend/.env | fly secrets import --app "${APP_NAME}"
fly secrets set \
  BACKEND_URL="https://${APP_NAME}.fly.dev"  \
  FRONTEND_URL="https://${APP_NAME}.fly.dev" \
  NODE_ENV="production"                       \
  PORT="8080"                                 \
  --app "${APP_NAME}"

# ─── Version bumps ────────────────────────────────────────────────────────────

if [ "$BACKEND_CHANGED" = true ]; then
  echo "🔢 Bumping backend version..."
  (cd backend && npm version patch --no-git-tag-version)
  BACKEND_VERSION=$(node -p "require('./backend/package.json').version")
  echo "   → backend v${BACKEND_VERSION}"
fi

if [ "$FRONTEND_CHANGED" = true ]; then
  echo "🔢 Bumping frontend version..."
  (cd frontend && npm version patch --no-git-tag-version)
  FRONTEND_VERSION=$(node -p "require('./frontend/package.json').version")
  echo "   → frontend v${FRONTEND_VERSION}"
fi

# ─── Commit + tag + push ─────────────────────────────────────────────────────

if [ "$BACKEND_CHANGED" = true ] || [ "$FRONTEND_CHANGED" = true ]; then
  COMMIT_MSG="chore: deploy"
  [ "$BACKEND_CHANGED"  = true ] && COMMIT_MSG="${COMMIT_MSG} backend-v${BACKEND_VERSION}"
  [ "$FRONTEND_CHANGED" = true ] && COMMIT_MSG="${COMMIT_MSG} frontend-v${FRONTEND_VERSION}"

  echo "📝 Committing version bumps..."
  git add backend/package.json frontend/package.json
  git commit -m "${COMMIT_MSG}"

  if [ "$BACKEND_CHANGED" = true ]; then
    git tag -a "backend-v${BACKEND_VERSION}"  -m "Backend v${BACKEND_VERSION}"
  fi
  if [ "$FRONTEND_CHANGED" = true ]; then
    git tag -a "frontend-v${FRONTEND_VERSION}" -m "Frontend v${FRONTEND_VERSION}"
  fi

  echo "⬆️  Pushing to origin..."
  git push origin main --tags
fi

fly secrets set GIT_COMMIT="$(git rev-parse --short HEAD)" --app "${APP_NAME}"

# ─── Deploy ───────────────────────────────────────────────────────────────────

echo "🏗️  Building and deploying..."
CACHE_FLAGS=""
if [ "$CACHE" = "" ] || [ "$CACHE" = "false" ]; then
  CACHE_FLAGS="--no-cache --buildkit"
fi
fly deploy --app "${APP_NAME}" --regions "${REGIONS}" ${CACHE_FLAGS}

# ─── Summary ─────────────────────────────────────────────────────────────────

echo ""
echo "✅ Deploy complete!"
echo "🌐 https://${APP_NAME}.fly.dev"
echo ""
echo "Deployed versions:"
echo "  backend:  v${BACKEND_VERSION}  (tag: $(get_last_tag backend))"
echo "  frontend: v${FRONTEND_VERSION} (tag: $(get_last_tag frontend))"
echo ""
echo "Useful commands:"
echo "  fly logs --app ${APP_NAME}              View logs"
echo "  fly ssh console --app ${APP_NAME}       SSH into container"
echo "  fly status --app ${APP_NAME}            Check status"
echo "  git tag --list 'backend-v*'             List backend deploy history"
echo "  git tag --list 'frontend-v*'            List frontend deploy history"
echo "  ./rollback.sh backend 1.0.23            Roll back backend to v1.0.23"

exit 0
