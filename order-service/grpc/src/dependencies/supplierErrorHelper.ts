import { parseSupplierId } from '@foc/grpc';
import { InvalidSupplierError } from '../grpc/error';

export function toSupplierRpcId(supplierId: string): number {
  const id = parseSupplierId(supplierId);
  if (id === undefined) {
    throw new InvalidSupplierError('supplierId must be a positive safe integer');
  }
  return id;
}
