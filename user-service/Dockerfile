# Steps to build user-service in a Docker image

# --- Build stage ---
FROM node:20-slim AS build
WORKDIR /app

# OpenSSL is needed by Prisma's engine.
RUN apt-get update && apt-get install -y --no-install-recommends openssl && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
RUN npm ci

COPY . .
RUN npx prisma generate && npm run build

# --- Runtime stage ---
FROM node:20-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production

RUN apt-get update && apt-get install -y --no-install-recommends openssl && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
RUN npm ci --omit=dev

# Copy compiled application from the build stage.
COPY --from=build /app/dist ./dist

# Copy Prisma's generated engine/client artifacts.
COPY --from=build /app/node_modules/.prisma ./node_modules/.prisma

# Copy Prisma schema/migrations and gRPC proto files.
COPY prisma ./prisma
COPY proto ./proto

EXPOSE 3001 50052
CMD ["node", "dist/index.js"]
