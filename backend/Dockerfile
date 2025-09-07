# Use Node.js 18 LTS
FROM node:18-slim

# Set working directory
WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    postgresql-client \
    curl \
    openssl \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Copy package files
COPY package*.json ./ 
COPY tsconfig.json ./

# Install all dependencies
RUN npm ci

# Copy source code
COPY . .
COPY prisma ./prisma

# Create logs directory
RUN mkdir -p logs

# Create non-root user
RUN addgroup --system nodejs
RUN adduser --system --ingroup nodejs nextjs

# Change ownership
RUN chown -R nextjs:nodejs /app
USER nextjs

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/health || exit 1

# Start script
COPY --chown=nextjs:nodejs start.sh ./ 
RUN chmod +x start.sh

CMD ["./start.sh"]
