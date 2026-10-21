# Must be built with context = repo root (FoC/), not this folder.
# compose.yaml sets: context: ..  dockerfile: user-service/Dockerfile

# Shared messaging is an npm workspace: use its repository lockfile.
FROM node:20-slim AS messaging-deps
WORKDIR /repo

COPY package*.json ./
COPY shared/messaging/package.json ./shared/messaging/
COPY shared/grpc/package.json ./shared/grpc/

#ignore the following for now, since package.json is deleted
COPY order-service/grpc/package.json ./order-service/grpc/
#ignore this for now, since package.json is deleted
COPY credit-service/grpc/package.json ./credit-service/grpc/ 
#ignore this for now, since package.json is deleted
COPY supplier-service/grpc/package.json ./supplier-service/grpc/
#ignore this for now, since package.json is deleted

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
#copies all files from user-service workdir
# prebuild compiles messaging; build generates Prisma and compiles this service.
RUN npm run build

# Keep only the shared package's locked production dependencies.
FROM messaging-deps AS messaging-production
RUN npm ci --omit=dev --workspace @foc/messaging --include-workspace-root=false

# --- Runtime stage ---
FROM node:20-slim AS runtime
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
CMD ["node", "dist/index.js"]
