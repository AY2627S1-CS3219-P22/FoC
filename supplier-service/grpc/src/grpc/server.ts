import { status } from '@grpc/grpc-js';
import {
  SupplierService,
  createServer,
  unimplemented,
  type SupplierServiceHandlers,
} from '@foc/grpc';

type IsOpenHandler = SupplierServiceHandlers['IsOpen'];

const IsOpen: IsOpenHandler = (call, callback) => {
  void handleIsOpen(call, callback);
};

async function handleIsOpen(...[call, callback]: Parameters<IsOpenHandler>): Promise<void> {
  const id = Number(call.request.supplierId);
  if (!Number.isSafeInteger(id) || id <= 0) {
    callback({ code: status.INVALID_ARGUMENT, details: 'supplier_id must be a positive integer' });
    return;
  }

  try {
    //lazy so createGrpcServer() does not open a database pool (GetSupplier is still a stub)
    const { isSupplierOpenService } = await import('@/database/repository-helpers');
    const { NotFoundError } = await import('@/middleware/errors');
    try {
      const isOpen = await isSupplierOpenService(id);
      callback(null, { isOpen });
    } catch (err) {
      if (err instanceof NotFoundError) {
        callback({ code: status.NOT_FOUND, details: err.message });
        return;
      }
      throw err;
    }
  } catch (err) {
    console.error(err);
    callback({ code: status.INTERNAL, details: 'internal' });
  }
}

export const handlers: SupplierServiceHandlers = {
  GetSupplier: unimplemented('GetSupplier'),
  IsOpen,
};

export function createGrpcServer() {
  return createServer(SupplierService.service, handlers);
}
