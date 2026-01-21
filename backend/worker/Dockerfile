# Stage 1: Base image with dependencies
FROM node:20-alpine AS base

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# Set working directory
WORKDIR /app

# Copy root package files for workspace support
COPY package*.json ./
COPY backend/worker/package*.json ./backend/worker/
COPY backend/shared/package*.json ./backend/shared/
COPY backend/api/package*.json ./backend/api/

# Install dependencies using workspaces
RUN npm install --omit=dev --workspace=@greennewstracker/worker --workspace=@greennewstracker/shared && \
    npm cache clean --force

# Stage 2: Build stage
FROM base AS builder

# Install build dependencies
RUN apk add --no-cache python3 make g++

# Install all dependencies (including dev)
RUN npm install

# Copy source code
COPY backend/worker ./backend/worker
COPY backend/shared ./backend/shared
COPY tsconfig.json ./
COPY backend/tsconfig.json ./backend/

# Build shared first, then worker
RUN npm run build --workspace=@greennewstracker/shared && \
    npm run build --workspace=@greennewstracker/worker

# Stage 3: Production stage
FROM node:20-alpine AS production

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init tzdata && \
    cp /usr/share/zoneinfo/Etc/UTC /etc/localtime && \
    echo "Etc/UTC" > /etc/timezone

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY backend/worker/package*.json ./backend/worker/
COPY backend/shared/package*.json ./backend/shared/

# Install only production dependencies
RUN npm install --omit=dev --workspace=@greennewstracker/worker --workspace=@greennewstracker/shared && \
    npm cache clean --force

# Copy built application from builder stage
COPY --from=builder --chown=nodejs:nodejs /app/backend/worker/dist ./backend/worker/dist
COPY --from=builder --chown=nodejs:nodejs /app/backend/shared/dist ./backend/shared/dist
COPY --from=builder --chown=nodejs:nodejs /app/node_modules ./node_modules

# Switch to non-root user
USER nodejs

# Health check
HEALTHCHECK --interval=60s --timeout=10s --start-period=60s --retries=3 \
    CMD node -e "process.exit(0)"

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# Start the worker
WORKDIR /app/backend/worker
CMD ["node", "dist/index.js"]
