# Multi-stage build for optimal size
ARG CACHE_BUST=1

FROM node:20-alpine AS frontend-builder
ARG CACHE_BUST
RUN echo "Build started: ${CACHE_BUST}"
WORKDIR /app

# Copy package.json files for all workspaces
COPY package*.json ./
COPY packages/shared/package*.json ./packages/shared/
COPY frontend/package*.json ./frontend/

# Copy the base tsconfig file
COPY tsconfig.base.json ./

# Copy source code
COPY packages/shared/ ./packages/shared/
COPY frontend/ ./frontend/

# Install TypeScript globally
#RUN npm install -g typescript

# Build shared package FIRST with all dependencies
WORKDIR /app/packages/shared
RUN npm install
RUN npm run build

# Build frontend
WORKDIR /app/frontend
RUN npm ci
ARG VITE_MODE=production
RUN npm run build -- --mode ${VITE_MODE}

# --- Backend Builder ---
FROM node:20-alpine AS backend-builder

WORKDIR /app

# Copy package.json files for all workspaces
COPY package*.json ./
COPY packages/shared/package*.json ./packages/shared/
COPY backend/package*.json ./backend/

# Copy the base tsconfig file
COPY tsconfig.base.json ./

# Copy source code
COPY packages/shared/ ./packages/shared/
COPY backend/ ./backend/

# Install TypeScript globally
#RUN npm install -g typescript

# ✅ Build shared package FIRST in the same stage
WORKDIR /app/packages/shared
RUN npm install
RUN npm run build

# ✅ Now build backend - it will use the built shared package
WORKDIR /app/backend
RUN npm ci
RUN npm run build

# ✅ Fix: Move the backend build output to the expected location
RUN echo "=== BEFORE FIX ===" && ls -la /app/backend/dist/
RUN if [ -d "/app/backend/dist/backend" ]; then \
      echo "Moving dist/backend to dist/..." && \
      cp -r /app/backend/dist/backend/* /app/backend/dist/ && \
      rm -rf /app/backend/dist/backend; \
    fi
RUN echo "=== AFTER FIX ===" && ls -la /app/backend/dist/

# --- Final production image ---
FROM node:20-alpine

WORKDIR /app

# Copy production node_modules from backend builder
COPY --from=backend-builder /app/backend/node_modules ./node_modules

# Copy built backend to /app/dist
COPY --from=backend-builder /app/backend/dist ./dist

# Copy built frontend to be served by backend
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
