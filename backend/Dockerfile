# Builder stage
FROM node:18-bullseye AS builder

# Install dependencies for Prisma
RUN apt-get update \
  && apt-get install -y openssl \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package*.json tsconfig.json ./
RUN npm ci

COPY src ./src
COPY prisma ./prisma

# Dummy DB URL just for prisma generate
ENV DATABASE_URL="postgresql://user:pass@localhost:5432/placeholder?schema=public"

RUN npx prisma generate
RUN npm run build

# Production stage
FROM node:18-bullseye-slim AS production

# Install dumb-init for signal handling
RUN apt-get update \
  && apt-get install -y dumb-init openssl \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma

# Create uploads directory and app user
RUN groupadd -g 1001 nodejs \
 && useradd -m -u 1001 -g nodejs quizspark \
 && mkdir -p uploads \
 && chown -R quizspark:nodejs /app

USER quizspark

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })"

ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/server.js"]
