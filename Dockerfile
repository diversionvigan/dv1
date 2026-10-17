# Stage 1: Build frontend assets and dependencies
FROM node:20-alpine AS builder

WORKDIR /app

# Install dependencies needed for npm install
COPY package*.json ./
RUN npm ci || npm install

# Copy source files
COPY . .

# Build production assets (Vite builds into /dist)
RUN npm run build

# Stage 2: Production runner
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

# Install tsx globally or rely on production node_modules
COPY package*.json ./
RUN npm ci --omit=dev || npm install --omit=dev

# Copy built frontend dist and server source from builder
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/server.ts ./server.ts
COPY --from=builder /app/server ./server
COPY --from=builder /app/src ./src
COPY --from=builder /app/public ./public
COPY --from=builder /app/data ./data
COPY --from=builder /app/tsconfig.json ./tsconfig.json

# Pre-create data and uploads directories and ensure correct user ownership
RUN mkdir -p /app/data /app/public/uploads && chmod -R 777 /app/data /app/public/uploads && chown -R node:node /app/data /app/public/uploads /app

# USER node (Disabled to allow root execution and prevent mounted volume permission blocks)

EXPOSE 3000

# Health check verifies the live API endpoint
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://127.0.0.1:3000/api/health || exit 1

CMD ["npm", "start"]
