import { status } from '@grpc/grpc-js';
import type { RpcOptions } from '@foc/grpc';

// Retry only the transient codes in feat/credit-implementation's handoff.
// Mutations keep their original payload: Credit deduplicates by operation/order.
export async function retryCreditRpc<T>(invoke: () => Promise<T>, options: RpcOptions): Promise<T> {
  const deadline = options.deadline instanceof Date ? options.deadline.getTime() : options.deadline;
  if (deadline === undefined || !Number.isFinite(deadline)) {
    throw new Error('Credit retries require an overall deadline');
  }
  for (let attempt = 1; ; attempt++) {
    try { return await invoke(); }
    catch (error) {
      const code = (error as { code?: unknown } | null)?.code;
      if (attempt >= 3 || ![status.UNAVAILABLE, status.ABORTED, status.DEADLINE_EXCEEDED].includes(code as number)) throw error;
      const delay = 100 * 2 ** (attempt - 1);
      if (Date.now() + delay >= deadline) throw error;
      await new Promise(resolve => setTimeout(resolve, delay));
      if (Date.now() >= deadline) throw error;
    }
  }
}
