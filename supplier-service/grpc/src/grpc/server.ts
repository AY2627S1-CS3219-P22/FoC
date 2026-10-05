import {
  SupplierService,
  createServer,
  unimplemented,
  type SupplierServiceHandlers,
} from '@foc/grpc';

export const handlers: SupplierServiceHandlers = {
  GetSupplier: unimplemented('GetSupplier'),
};

export function createGrpcServer() {
  return createServer(SupplierService.service, handlers);
}
