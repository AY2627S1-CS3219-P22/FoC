// AI Assistance Disclosure: ChatGPT (Codex), 2026-10-22.
// Scope: Implemented author-approved Order validation/authentication/RPC integration.
// Author review: Pending; see ../../../usage-log.md.

//AI assistance disclosure: ChatGPT (Codex), 2026-10-22.
//Scope:Formatting help to avoid messy try catch when integrating supplierId grpc call error

import {createUserClient,createSupplierClient, grpcsupplierSchema, isOpenResponseSchema, parseSupplierId,} from '@foc/grpc';

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
      return grpcsupplierSchema.parse(response);
    },
    isSupplierOpen: async (supplierId: string) => {
      const response = await supplier.isOpen({
        supplierId: toSupplierRpcId(supplierId),
      });
      return isOpenResponseSchema.parse(response);
    },
    close: () => { user.close(); supplier.close(); },
  };
}
