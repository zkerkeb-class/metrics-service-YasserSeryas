# Build stage
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install && npm cache clean --force

# Production stage
FROM node:18-alpine AS production

# Install system dependencies for health checks and monitoring
RUN apk add --no-cache \
    curl \
    tini \
    && rm -rf /var/cache/apk/*

# Create app directory and user
WORKDIR /app

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nextjs -u 1001

# Copy dependencies from builder stage
COPY --from=builder /app/node_modules ./node_modules

# Copy application code
COPY --chown=nextjs:nodejs src/ ./src/
COPY --chown=nextjs:nodejs package*.json ./
COPY --chown=nextjs:nodejs .env.production ./.env

# Create logs directory
RUN mkdir -p logs && chown -R nextjs:nodejs logs

# Expose port
EXPOSE 3011

# Switch to non-root user
USER nextjs

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:3011/health || exit 1

# Use tini as entrypoint for proper signal handling
ENTRYPOINT ["/sbin/tini", "--"]

# Start the application
CMD ["node", "src/app.js"]

# Metadata
LABEL maintainer="YasserSeryas"
LABEL version="1.0.0"
LABEL description="Metrics and monitoring microservice for reservation system"
