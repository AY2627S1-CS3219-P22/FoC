# AI Assistance Disclosure:
# Tool: OpenAI Codex (model: GPT-6), dates: 2026-10-20–2026-10-21 (Asia/Singapore).
# Scope: Containerized credit gRPC/REST, migration CLI, and human-specified SQL migrations.
# Author review: Pending human review.
# Prompts and key responses: ai/usage-log.md, entries 003, 005–006, 022 and 024.
# AI-generated; human review pending.

FROM node:22-alpine AS build
WORKDIR /repo

COPY package.json package-lock.json ./
COPY shared/grpc/package.json ./shared/grpc/
COPY order-service/grpc/package.json ./order-service/grpc/
COPY credit-service/package.json ./credit-service/
COPY supplier-service/grpc/package.json ./supplier-service/grpc/
RUN npm ci --include=dev

COPY shared/grpc ./shared/grpc
COPY user-service/proto ./user-service/proto
COPY credit-service/tsconfig.json ./credit-service/
COPY credit-service/src ./credit-service/src
COPY credit-service/scripts ./credit-service/scripts
RUN npm run build --workspace @foc/grpc \
 && npm run build --workspace @foc/credit-grpc \
 && npm prune --omit=dev

FROM node:22-alpine AS runtime
WORKDIR /repo
ENV NODE_ENV=production
ENV GRPC_HOST=0.0.0.0
ENV GRPC_PORT=50054

COPY --from=build /repo/node_modules ./node_modules
COPY --from=build /repo/shared/grpc/package.json ./shared/grpc/
COPY --from=build /repo/shared/grpc/dist ./shared/grpc/dist
COPY --from=build /repo/shared/grpc/proto ./shared/grpc/proto
COPY --from=build /repo/user-service/proto ./user-service/proto
COPY --from=build /repo/credit-service/package.json ./credit-service/
COPY --from=build /repo/credit-service/dist ./credit-service/dist
COPY --from=build /repo/credit-service/scripts ./credit-service/scripts
COPY credit-service/migrations ./credit-service/migrations

WORKDIR /repo/credit-service
EXPOSE 50054 3004
CMD ["node", "dist/index.js"]
