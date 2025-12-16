# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Install pnpm
RUN corepack enable && corepack prepare pnpm@8.15.0 --activate

# Copy package files
COPY package.json pnpm-lock.yaml* ./
COPY apps/server/package.json ./apps/server/

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source code
COPY apps/server ./apps/server

# Generate Prisma client
RUN cd apps/server && pnpm db:generate

# Build
RUN cd apps/server && pnpm build

# Production stage
FROM node:20-alpine AS production

WORKDIR /app

# Install pnpm
RUN corepack enable && corepack prepare pnpm@8.15.0 --activate

# Copy built files
COPY --from=builder /app/apps/server/dist ./dist
COPY --from=builder /app/apps/server/package.json ./
COPY --from=builder /app/apps/server/prisma ./prisma
COPY --from=builder /app/node_modules ./node_modules

# Set environment
ENV NODE_ENV=production

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/health || exit 1

# Start server
CMD ["node", "dist/index.js"]
