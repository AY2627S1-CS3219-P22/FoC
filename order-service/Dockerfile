# AI Assistance Disclosure: ChatGPT (Codex), 2026-10-21.
# Scope: Generated Order Docker build; updated Credit manifest path for merge on 2026-10-22.
# Author review: Pending; see usage-log.md.
FROM node:22-slim AS build
WORKDIR /repo
RUN apt-get update && apt-get install -y --no-install-recommends openssl && rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json ./
COPY user-service/package.json ./user-service/
COPY shared/grpc/package.json shared/grpc/package.json
COPY shared/messaging/package.json shared/messaging/package.json
COPY order-service/grpc/package.json order-service/grpc/package.json
COPY credit-service/package.json credit-service/package.json
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
