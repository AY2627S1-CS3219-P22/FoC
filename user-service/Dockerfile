# Must be built with context = repo root (FoC/), not this folder.

# Shared messaging is an npm workspace: use its repository lockfile.
FROM node:22-slim AS messaging-deps
WORKDIR /repo

COPY package*.json ./
COPY shared/messaging/package.json ./shared/messaging/
COPY shared/grpc/package.json ./shared/grpc/

COPY order-service/grpc/package.json ./order-service/grpc/
COPY credit-service/grpc/package.json ./credit-service/grpc/ 
COPY supplier-service/grpc/package.json ./supplier-service/grpc/

RUN npm ci --workspace @foc/messaging --include-workspace-root=false

# --- Build stage ---
FROM messaging-deps AS build

RUN apt-get update && apt-get install -y --no-install-recommends openssl \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /repo/user-service
COPY user-service/package.json user-service/package-lock.json ./
COPY user-service/prisma ./prisma
RUN PRISMA_SKIP_POSTINSTALL_GENERATE=true npm ci

COPY shared/messaging/tsconfig.json /repo/shared/messaging/
COPY shared/messaging/src /repo/shared/messaging/src

#bc workdir is changed copy from user-service folder
COPY user-service/src ./src
COPY user-service/tsconfig.json ./
COPY user-service/proto ./proto

# prebuild compiles messaging; build generates Prisma and compiles this service.
RUN npm run build

# Keep only the shared package's locked production dependencies.
FROM messaging-deps AS messaging-production
RUN npm ci --omit=dev --workspace @foc/messaging --include-workspace-root=false

# --- Migrate stage (one-off job) ---
# Reuses the build stage, which has the pinned Prisma CLI (a devDependency)
# plus the schema and migrations.
FROM build AS migrate
USER node
CMD ["npx", "prisma", "migrate", "deploy"]

# --- Runtime stage ---
FROM node:22-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production

RUN apt-get update && apt-get install -y --no-install-recommends openssl \
  && rm -rf /var/lib/apt/lists/*

#Added in for messaging package to work, since it is a workspace dependency and not installed in the user-service node_modules
# Preserve the relative file dependency: /app -> ../shared/messaging.
COPY --from=messaging-production /repo/node_modules /node_modules
COPY --from=build /repo/shared/messaging/package.json /shared/messaging/
COPY --from=build /repo/shared/messaging/dist /shared/messaging/dist

COPY user-service/package*.json ./
RUN PRISMA_SKIP_POSTINSTALL_GENERATE=true npm ci --omit=dev

# Copy compiled application from the build stage.
COPY --from=build /repo/user-service/dist ./dist

# Copy Prisma's generated engine/client artifacts.
COPY --from=build /repo/user-service/node_modules/.prisma ./node_modules/.prisma

# Copy Prisma schema/migrations and gRPC proto files.
COPY user-service/prisma ./prisma
COPY user-service/proto ./proto

RUN node -e "require('@foc/messaging'); require('@prisma/client')"

EXPOSE 3001 50051

# The messaging logger writes to /app/logs at startup. Give the non-root user
# that one folder; the rest of /app stays read-only to it.
RUN mkdir -p logs && chown node:node logs
USER node
CMD ["node", "dist/index.js"]
