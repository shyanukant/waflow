# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY backend/package*.json ./

# Install dependencies
RUN npm ci

# Copy source
COPY backend/ .

# Build TypeScript
RUN npm run build

# Production stage
FROM node:20-alpine

WORKDIR /app

# Install production dependencies only
COPY backend/package*.json ./
RUN npm ci --only=production

# Copy built files
COPY --from=builder /app/dist ./dist

# Create sessions directory
RUN mkdir -p /app/auth_sessions

# Expose port
EXPOSE 5000

# Environment
ENV NODE_ENV=production

# Start
CMD ["node", "dist/index.js"]
