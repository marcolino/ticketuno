# Multi-stage build for optimal size
FROM node:18-alpine AS frontend-builder

WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
COPY shared/ ../shared/
RUN npm run build

FROM node:18-alpine AS backend-builder
WORKDIR /app/backend

# 1. Copy and install dependencies (caches well)
COPY backend/package*.json ./
RUN npm ci

# 2. Copy backend source code
COPY backend/ ./

# 3. COPY SHARED FILES HERE, JUST BEFORE THE BUILD
COPY shared/ ../shared/
RUN ln -sf ../../shared src/shared

# 4. Now run the build
RUN npm run build

# Create symlink for shared types inside src directory
RUN ln -sf ../../shared src/shared

# DEBUG ONLY ############################################################################################
RUN echo "=== DEBUG: Checking /app/ directory ===" && ls -la /app/
RUN echo "=== DEBUG: Looking for 'shared' folder ===" && find /app -name "shared" -type d 2>/dev/null
RUN echo "=== DEBUG: Contents of potential shared locations ===" && \
    (ls -la /app/shared/ 2>/dev/null || echo "/app/shared/ not found") && \
    (ls -la /app/backend/shared/ 2>/dev/null || echo "/app/backend/shared/ not found")
#########################################################################################################

RUN npm run build

# Final production image
FROM node:18-alpine

WORKDIR /app

# Install production dependencies only
COPY backend/package*.json ./
RUN npm ci --only=production && \
    npm cache clean --force

# Copy built backend - with symlink approach, output is at /app/backend/dist/
COPY --from=backend-builder /app/backend/dist ./dist

# Copy built frontend to be served by backend
COPY --from=frontend-builder /app/frontend/dist ./public

# Copy the locale files from the builder stage
COPY --from=backend-builder /app/shared/ /shared/

# Create data directory for SQLite
RUN mkdir -p /data && chown -R node:node /data

# Add sqlite3
RUN apk add --no-cache sqlite

# Use non-root user
USER node

EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:8080/api/v1/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# DEBUG ONLY ############################################################################################
RUN echo "=== FINAL STAGE DEBUG ===" && find / -name "shared" -type d 2>/dev/null | head -20
#########################################################################################################

CMD ["node", "dist/server.js"]
