# Must be built with context = repo root (FoC/), not this folder.
# compose.yaml sets: context: ..  dockerfile: user-service/Dockerfile

# --- Build stage ---
FROM node:20-slim AS build
WORKDIR /repo

RUN apt-get update && apt-get install -y --no-install-recommends openssl \
  && rm -rf /var/lib/apt/lists/*

COPY shared/messaging/package.json shared/messaging/tsconfig.json ./shared/messaging/
COPY shared/messaging/src ./shared/messaging/src
WORKDIR /repo/shared/messaging
RUN npm install && npm run build

WORKDIR /repo/user-service
COPY user-service/package.json user-service/package-lock.json ./
COPY user-service/prisma ./prisma
COPY user-service/proto ./proto
COPY user-service/src ./src
COPY user-service/tsconfig.json ./
RUN npm ci
RUN npx prisma generate && npm run build

# --- Runtime stage ---
FROM node:20-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production

RUN apt-get update && apt-get install -y --no-install-recommends openssl \
  && rm -rf /var/lib/apt/lists/*

COPY --from=build /repo/user-service/package.json ./
COPY --from=build /repo/user-service/node_modules ./node_modules
COPY --from=build /repo/user-service/dist ./dist
COPY --from=build /repo/user-service/prisma ./prisma
COPY --from=build /repo/user-service/proto ./proto
COPY --from=build /repo/shared/messaging /shared/messaging

EXPOSE 3001 50051
CMD ["node", "dist/index.js"]
