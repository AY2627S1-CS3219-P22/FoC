# AI Assistance Disclosure: ChatGPT (Codex), 2026-10-24.
# Scope: Order-only package metadata copies support current and merged workspace layouts; review pending; see usage-log.md.
FROM node:22-slim AS build
WORKDIR /repo
RUN apt-get update && apt-get install -y --no-install-recommends openssl && rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json ./
COPY shared/grpc/package.json shared/grpc/package.json
COPY shared/messaging/package.json shared/messaging/package.json
COPY order-service/grpc/package.json order-service/grpc/package.json
# The Dockerfile-specific allowlist includes only package manifests from peers.
# Directory copies tolerate Credit/Supplier package relocation after teammate merges.
COPY credit-service/ credit-service/
COPY supplier-service/ supplier-service/
COPY user-service/ user-service/
RUN npm ci
COPY shared/grpc shared/grpc
COPY user-service/proto user-service/proto
COPY order-service/grpc order-service/grpc
COPY order-service/prisma order-service/prisma
RUN npm run build --workspace @foc/grpc && npm run build --workspace @foc/order-grpc

FROM node:22-slim AS runtime
WORKDIR /repo
ENV NODE_ENV=production
RUN apt-get update && apt-get install -y --no-install-recommends openssl && rm -rf /var/lib/apt/lists/*
COPY --from=build --chown=node:node /repo /repo
WORKDIR /repo/order-service/grpc
USER node
EXPOSE 3003 50053
CMD ["sh", "-c", "npm run prisma:deploy && npm start"]
