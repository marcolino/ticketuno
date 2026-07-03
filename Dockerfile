# Multi-stage build for optimal size
FROM node:18-alpine AS frontend-builder

WORKDIR /app
# Copy package.json files for all workspaces
COPY package*.json ./
COPY packages/shared/package*.json ./packages/shared/
COPY frontend/package*.json ./frontend/

# Copy source code
COPY packages/shared/ ./packages/shared/
COPY frontend/ ./frontend/

# Build shared package first
WORKDIR /app/packages/shared
RUN npm ci && npm run build

# Build frontend
WORKDIR /app/frontend
RUN npm ci
# Link to the built shared package
RUN npm link ../packages/shared || npm install ../packages/shared
ARG VITE_MODE=production
RUN npm run build -- --mode ${VITE_MODE}

# --- Backend Builder ---
FROM node:18-alpine AS backend-builder

WORKDIR /app
COPY package*.json ./
COPY packages/shared/package*.json ./packages/shared/
COPY backend/package*.json ./backend/

COPY packages/shared/ ./packages/shared/
COPY backend/ ./backend/

# Build shared package
WORKDIR /app/packages/shared
RUN npm ci && npm run build

# Build backend
WORKDIR /app/backend
RUN npm ci
RUN npm link ../packages/shared || npm install ../packages/shared
RUN npm run build

# --- Final production image ---
FROM node:18-alpine

WORKDIR /app

# Install production dependencies for backend only
COPY backend/package*.json ./
RUN npm ci --only=production && npm cache clean --force

# Copy built backend
COPY --from=backend-builder /app/backend/dist ./dist

# Copy built frontend
COPY --from=frontend-builder /app/frontend/dist ./public

# Copy shared package (for runtime if needed)
COPY --from=backend-builder /app/packages/shared ./packages/shared

# Copy templates from backend source
COPY --from=backend-builder /app/backend/src/templates ./dist/templates

# Create data directory for SQLite
RUN mkdir -p /data && chown -R node:node /data

# Add sqlite3
RUN apk add --no-cache sqlite

# Use non-root user
USER node

# Expose default port
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:8080/api/v1/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

CMD ["node", "dist/server.js"]
