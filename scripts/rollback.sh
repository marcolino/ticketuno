#!/usr/bin/env bash
#
# Roll back a single component to a previously deployed version.
# Usage: ./rollback.sh <backend|frontend> <version>
# Example: ./rollback.sh backend 1.0.23

set -e

COMPONENT=$1
VERSION=$2
TAG="${COMPONENT}-v${VERSION}"

if [ -z "$COMPONENT" ] || [ -z "$VERSION" ]; then
  echo "Usage: ./rollback.sh <backend|frontend> <version>"
  echo ""
  echo "Available backend versions:  $(git tag --list 'backend-v*'  --sort=-version:refname | tr '\n' ' ')"
  echo "Available frontend versions:  $(git tag --list 'frontend-v*' --sort=-version:refname | tr '\n' ' ')"
  exit 1
fi

if [ "$COMPONENT" != "backend" ] && [ "$COMPONENT" != "frontend" ]; then
  echo "❌ Component must be 'backend' or 'frontend'."
  exit 1
fi

if ! git tag --list | grep -q "^${TAG}$"; then
  echo "❌ Tag '${TAG}' not found."
  echo "   Available: $(git tag --list "${COMPONENT}-v*" --sort=-version:refname | tr '\n' ' ')"
  exit 1
fi

if [ -n "$(git status --porcelain)" ]; then
  echo "❌ Working directory is dirty. Commit or stash changes first."
  exit 1
fi

echo "⏪ Rolling back ${COMPONENT} to v${VERSION}..."

# Restore the component directory from the target tag
git checkout "${TAG}" -- "${COMPONENT}/"

# The package.json version is now the old one — that's intentional.
# We do NOT re-bump; we redeploy at the exact version that tag represents.

CURRENT_VERSION=$(node -p "require('./${COMPONENT}/package.json').version")
echo "   Restored ${COMPONENT} to v${CURRENT_VERSION}"

git add "${COMPONENT}/"
git commit -m "chore: rollback ${COMPONENT} to v${VERSION}"
git push origin main

echo "🏗️  Re-deploying..."
./deploy.sh --force

echo "✅ Rollback complete — ${COMPONENT} is back at v${VERSION}"
