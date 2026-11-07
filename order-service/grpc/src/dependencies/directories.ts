// ChatGPT (Codex), 2026-11-04: Use validated Supplier coordinates for the approved pickupLocation string; review pending; see ../../../usage-log.md.
// ChatGPT (Codex), 2026-10-30: Removed unused Supplier IsOpen adapter; human review pending.
// AI Assistance Disclosure: ChatGPT (Codex), 2026-10-22.
// Scope: Integrated approved shared Supplier validation and missing-location placeholder.
// Author review: Pending; see ../../../usage-log.md.

//AI assistance disclosure: ChatGPT (Codex), 2026-10-22.
//Scope:Formatting help to avoid messy try catch when integrating supplierId grpc call error

import {createUserClient,createSupplierClient, grpcsupplierSchema,} from '@foc/grpc';

import {toSupplierRpcId} from './supplierErrorHelper';


export function createDirectories(userAddress: string, supplierAddress: string, timeoutMs: number) {
  const user = createUserClient(userAddress, { timeoutMs });
  const supplier = createSupplierClient(supplierAddress, { timeoutMs });
  return {
    getRequester: (userId: string) => user.getPublicProfile({ userId }),
    getSupplier: async (supplierId: string) => {
      const response = await supplier.getSupplier({
        supplierId: toSupplierRpcId(supplierId),
      });
      const validated = grpcsupplierSchema.parse(response);
      return {
        ...validated,
        pickupLocation: `${validated.latitude}, ${validated.longitude}`,
      };
    },
    close: () => { user.close(); supplier.close(); },
  };
}
