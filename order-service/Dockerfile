# Build with the repository root as context; dependencies use its workspace lock.
FROM node:22-bookworm-slim AS build
WORKDIR /app

RUN apt-get update \
    && apt-get install -y --no-install-recommends openssl \
    && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
COPY shared/grpc/package.json ./shared/grpc/package.json
COPY order-service/package.json ./order-service/package.json
COPY order-service/grpc/package.json ./order-service/grpc/package.json
COPY credit-service/grpc/package.json ./credit-service/grpc/package.json
COPY supplier-service/grpc/package.json ./supplier-service/grpc/package.json
RUN npm ci --workspace @foc/order-service

COPY shared/grpc ./shared/grpc
COPY user-service/proto ./user-service/proto
RUN npm run build --workspace @foc/grpc
COPY order-service/prisma ./order-service/prisma
COPY order-service/src ./order-service/src
COPY order-service/scripts ./order-service/scripts
COPY order-service/tsconfig.json ./order-service/tsconfig.json
RUN npm run build --workspace @foc/order-service

FROM node:22-bookworm-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production

RUN apt-get update \
    && apt-get install -y --no-install-recommends openssl \
    && rm -rf /var/lib/apt/lists/*

# Keep the installed Prisma CLI for migrate deploy at container startup.
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package.json /app/package-lock.json ./
COPY --from=build /app/shared/grpc ./shared/grpc
COPY --from=build /app/user-service/proto ./user-service/proto
COPY --from=build /app/order-service/package.json ./order-service/package.json
COPY --from=build /app/order-service/prisma ./order-service/prisma
COPY --from=build /app/order-service/dist ./order-service/dist

WORKDIR /app/order-service
USER node
EXPOSE 3002
CMD ["sh", "-c", "../node_modules/.bin/prisma migrate deploy && exec node dist/index.js"]
