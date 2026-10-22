// AI Assistance Disclosure: ChatGPT (Codex), 2026-10-22.
// Scope: Implemented author-approved Order validation/authentication/RPC integration.
// Author review: Pending; see ../../../usage-log.md.
import { createUserClient, createSupplierClient } from '@foc/grpc';

export function createDirectories(userAddress: string, supplierAddress: string, timeoutMs: number) {
  const user = createUserClient(userAddress, { timeoutMs });
  const supplier = createSupplierClient(supplierAddress, { timeoutMs });
  return {
    getRequester: (userId: string) => user.getPublicProfile({ userId }),
    getSupplier: (supplierId: string) => supplier.getSupplier({ supplierId }),
    isSupplierOpen: (supplierId: string) => supplier.isOpen({ supplierId }),
    close: () => { user.close(); supplier.close(); },
  };
}
