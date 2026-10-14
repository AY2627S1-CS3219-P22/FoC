FROM node:22-alpine AS build
WORKDIR /app

# Install from the monorepo lockfile so @foc/grpc remains a workspace dependency.
COPY package.json package-lock.json ./
COPY shared/grpc/package.json shared/grpc/package.json
COPY credit-service/grpc/package.json credit-service/grpc/package.json
COPY order-service/grpc/package.json order-service/grpc/package.json
COPY supplier-service/grpc/package.json supplier-service/grpc/package.json
RUN npm ci --ignore-scripts

COPY shared/grpc shared/grpc
COPY credit-service/grpc credit-service/grpc
RUN npm run build --workspace @foc/grpc \
    && npm run build --workspace @foc/credit-grpc \
    && npm prune --omit=dev --ignore-scripts

FROM node:22-alpine AS runtime
WORKDIR /app/credit-service/grpc
ENV NODE_ENV=production
ENV GRPC_HOST=0.0.0.0
ENV GRPC_PORT=50053

COPY --from=build /app/node_modules /app/node_modules
COPY --from=build /app/shared/grpc/package.json /app/shared/grpc/package.json
COPY --from=build /app/shared/grpc/dist /app/shared/grpc/dist
COPY --from=build /app/shared/grpc/proto /app/shared/grpc/proto
# The shared loader resolves the existing User Service contract in place.
COPY user-service/proto /app/user-service/proto
COPY --from=build /app/credit-service/grpc/package.json ./package.json
COPY --from=build /app/credit-service/grpc/dist ./dist
COPY credit-service/db /app/credit-service/db
COPY credit-service/docker /app/credit-service/docker

USER node
EXPOSE 50053
HEALTHCHECK --interval=5s --timeout=4s --start-period=10s --retries=5 \
    CMD ["node", "../docker/healthcheck.cjs"]
CMD ["node", "dist/index.js"]
