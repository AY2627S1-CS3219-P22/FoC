# AI Assistance Disclosure:
# Tool: OpenAI Codex (model: GPT-6), dates: 2026-10-20–2026-10-21 (Asia/Singapore).
# Scope: Containerized credit gRPC/REST, migration CLI, and human-specified SQL migrations.
# Author review: Pending human review.
# Prompts and key responses: ai/usage-log.md, entries 003, 005–006, 022 and 024.
# AI-generated; human review pending.
# Entry 034: OpenAI Codex (GPT-6), 2026-10-22 (Asia/Singapore).
# Scope: Relocated the human-selected migration runner and updated references while making scripts/docs local-only.
# Changes await human review; prompts/key responses: credit-service/ai/usage-log.md, entry 034 (repository-relative).
# Entry 037: OpenAI Codex (GPT-6), 2026-10-22 Asia/Singapore.
# Scope: Added the human-selected messaging workspace to image build/runtime; review pending.
# Prompts/key responses: ai/usage-log.md, entry 037.

FROM node:22-alpine AS build
WORKDIR /repo

COPY package.json package-lock.json ./
COPY shared/grpc/package.json ./shared/grpc/
COPY shared/messaging/package.json ./shared/messaging/
COPY order-service/grpc/package.json ./order-service/grpc/
COPY credit-service/package.json ./credit-service/
COPY supplier-service/grpc/package.json ./supplier-service/grpc/
RUN npm ci --include=dev

COPY shared/grpc ./shared/grpc
COPY shared/messaging ./shared/messaging
COPY user-service/proto ./user-service/proto
COPY credit-service/tsconfig.json ./credit-service/
COPY credit-service/src ./credit-service/src
RUN npm run build --workspace @foc/grpc --workspace @foc/messaging \
 && npm run build --workspace @foc/credit-grpc \
 && npm prune --omit=dev

FROM node:22-alpine AS runtime
WORKDIR /repo
ENV NODE_ENV=production
ENV GRPC_HOST=0.0.0.0
ENV GRPC_PORT=50054

COPY --from=build /repo/node_modules ./node_modules
COPY --from=build /repo/shared/messaging/package.json ./shared/messaging/
COPY --from=build /repo/shared/messaging/dist ./shared/messaging/dist
COPY --from=build /repo/shared/grpc/package.json ./shared/grpc/
COPY --from=build /repo/shared/grpc/dist ./shared/grpc/dist
COPY --from=build /repo/shared/grpc/proto ./shared/grpc/proto
COPY --from=build /repo/user-service/proto ./user-service/proto
COPY --from=build /repo/credit-service/package.json ./credit-service/
COPY --from=build /repo/credit-service/dist ./credit-service/dist
COPY credit-service/migrations ./credit-service/migrations

WORKDIR /repo/credit-service
EXPOSE 50054 3004
CMD ["node", "dist/index.js"]
