-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('UNASSIGNED', 'ASSIGNED', 'PICKED_UP', 'DELIVERED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "CancellationReason" AS ENUM ('REQUESTER', 'EXPIRY');

-- CreateEnum
CREATE TYPE "CreditState" AS ENUM ('RESERVED', 'SETTLEMENT_PENDING', 'SETTLED', 'REFUND_PENDING', 'REFUNDED');

-- CreateEnum
CREATE TYPE "CreationState" AS ENUM ('PENDING', 'SUCCEEDED', 'COMPENSATING', 'FAILED');

-- CreateEnum
CREATE TYPE "CreditOperationType" AS ENUM ('RESERVE', 'SETTLE', 'REFUND');

-- CreateEnum
CREATE TYPE "OperationState" AS ENUM ('PENDING', 'PROCESSING', 'SUCCEEDED', 'PERMANENTLY_FAILED');

-- CreateTable
CREATE TABLE "OrderCreation" (
    "orderId" UUID NOT NULL,
    "requesterId" TEXT NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "requestFingerprint" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "state" "CreationState" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "OrderCreation_pkey" PRIMARY KEY ("orderId")
);

-- CreateTable
CREATE TABLE "Order" (
    "id" UUID NOT NULL,
    "requesterId" TEXT NOT NULL,
    "courierId" TEXT,
    "supplierId" BIGINT NOT NULL,
    "pickupStore" TEXT NOT NULL,
    "pickupLocation" TEXT NOT NULL,
    "requesterName" TEXT NOT NULL,
    "courierName" TEXT,
    "destination" TEXT NOT NULL,
    "requestDetails" TEXT NOT NULL,
    "credits" INTEGER NOT NULL,
    "expiryTime" TIMESTAMPTZ(3) NOT NULL,
    "status" "OrderStatus" NOT NULL DEFAULT 'UNASSIGNED',
    "cancellationReason" "CancellationReason",
    "creditState" "CreditState" NOT NULL DEFAULT 'RESERVED',
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,
    "acceptedAt" TIMESTAMPTZ(3),
    "pickedUpAt" TIMESTAMPTZ(3),
    "deliveredAt" TIMESTAMPTZ(3),
    "cancelledAt" TIMESTAMPTZ(3),

    CONSTRAINT "Order_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CreditOperation" (
    "id" UUID NOT NULL,
    "orderId" UUID NOT NULL,
    "type" "CreditOperationType" NOT NULL,
    "payload" JSONB NOT NULL,
    "state" "OperationState" NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "nextRetryAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "leaseExpiresAt" TIMESTAMPTZ(3),
    "lastError" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "CreditOperation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "OrderCreation_requesterId_idempotencyKey_key" ON "OrderCreation"("requesterId", "idempotencyKey");

-- CreateIndex
CREATE INDEX "Order_status_expiryTime_idx" ON "Order"("status", "expiryTime");

-- CreateIndex
CREATE INDEX "Order_requesterId_createdAt_idx" ON "Order"("requesterId", "createdAt");

-- CreateIndex
CREATE INDEX "Order_courierId_createdAt_idx" ON "Order"("courierId", "createdAt");

-- CreateIndex
CREATE INDEX "CreditOperation_state_nextRetryAt_idx" ON "CreditOperation"("state", "nextRetryAt");

-- CreateIndex
CREATE UNIQUE INDEX "CreditOperation_orderId_type_key" ON "CreditOperation"("orderId", "type");

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_id_fkey" FOREIGN KEY ("id") REFERENCES "OrderCreation"("orderId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CreditOperation" ADD CONSTRAINT "CreditOperation_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "OrderCreation"("orderId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Prisma does not express CHECK constraints; keep these in the migration.
ALTER TABLE "Order" ADD CONSTRAINT "Order_positive_values_check"
  CHECK ("supplierId" > 0 AND "credits" > 0);
ALTER TABLE "Order" ADD CONSTRAINT "Order_required_text_check"
  CHECK (length(btrim("requesterId")) > 0 AND length(btrim("pickupStore")) > 0
    AND length(btrim("pickupLocation")) > 0 AND length(btrim("requesterName")) > 0
    AND length(btrim("destination")) > 0 AND length(btrim("requestDetails")) > 0);
ALTER TABLE "Order" ADD CONSTRAINT "Order_courier_check"
  CHECK ("courierId" IS NULL OR (length(btrim("courierId")) > 0 AND "courierId" <> "requesterId"));
ALTER TABLE "Order" ADD CONSTRAINT "Order_expiry_check"
  CHECK ("expiryTime" > "createdAt");
ALTER TABLE "Order" ADD CONSTRAINT "Order_assignment_check"
  CHECK (("status" <> 'UNASSIGNED' OR "courierId" IS NULL)
    AND ("status" NOT IN ('ASSIGNED', 'PICKED_UP', 'DELIVERED') OR "courierId" IS NOT NULL));
ALTER TABLE "Order" ADD CONSTRAINT "Order_cancellation_check"
  CHECK (("status" = 'CANCELLED' AND "cancellationReason" IS NOT NULL AND "cancelledAt" IS NOT NULL)
    OR ("status" <> 'CANCELLED' AND "cancellationReason" IS NULL AND "cancelledAt" IS NULL));
ALTER TABLE "Order" ADD CONSTRAINT "Order_lifecycle_timestamps_check"
  CHECK (
    ("status" <> 'UNASSIGNED' OR ("acceptedAt" IS NULL AND "pickedUpAt" IS NULL AND "deliveredAt" IS NULL))
    AND ("status" <> 'ASSIGNED' OR ("acceptedAt" IS NOT NULL AND "pickedUpAt" IS NULL AND "deliveredAt" IS NULL))
    AND ("status" <> 'PICKED_UP' OR ("acceptedAt" IS NOT NULL AND "pickedUpAt" IS NOT NULL AND "deliveredAt" IS NULL))
    AND ("status" <> 'DELIVERED' OR ("acceptedAt" IS NOT NULL AND "pickedUpAt" IS NOT NULL AND "deliveredAt" IS NOT NULL))
    AND ("status" <> 'CANCELLED' OR "deliveredAt" IS NULL)
    AND ("acceptedAt" IS NULL OR ("courierId" IS NOT NULL AND "acceptedAt" >= "createdAt"))
    AND ("pickedUpAt" IS NULL OR ("acceptedAt" IS NOT NULL AND "pickedUpAt" >= "acceptedAt"))
    AND ("deliveredAt" IS NULL OR ("pickedUpAt" IS NOT NULL AND "deliveredAt" >= "pickedUpAt"))
    AND ("cancelledAt" IS NULL OR "cancelledAt" >= "createdAt")
  );
ALTER TABLE "Order" ADD CONSTRAINT "Order_credit_state_check"
  CHECK (("status" IN ('UNASSIGNED', 'ASSIGNED', 'PICKED_UP') AND "creditState" = 'RESERVED')
    OR ("status" = 'DELIVERED' AND "creditState" IN ('SETTLEMENT_PENDING', 'SETTLED'))
    OR ("status" = 'CANCELLED' AND "creditState" IN ('REFUND_PENDING', 'REFUNDED')));
ALTER TABLE "OrderCreation" ADD CONSTRAINT "OrderCreation_required_text_check"
  CHECK (length(btrim("requesterId")) > 0 AND length(btrim("idempotencyKey")) > 0
    AND length(btrim("requestFingerprint")) > 0);
ALTER TABLE "CreditOperation" ADD CONSTRAINT "CreditOperation_attempts_check"
  CHECK ("attempts" >= 0);
