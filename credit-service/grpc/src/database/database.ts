import { Pool } from 'pg';
import type { CreditUnitOfWork, TransactionRepositories } from '../repositories/interfaces';
import { SqlCreditRepository } from '../repositories/sql-credit-repository';

export function createPool(connectionString: string): Pool {
  const pool = new Pool({ connectionString, max: 10, connectionTimeoutMillis: 3000, idleTimeoutMillis: 10000 });
  pool.on('error', () => console.error('Credit database connection failed'));
  return pool;
}

export class CreditDatabase implements CreditUnitOfWork {
  constructor(public readonly pool: Pool) {}

  async transaction<T>(action: (repositories: TransactionRepositories) => Promise<T>): Promise<T> {
    const client = await this.pool.connect();
    let discard = false;
    try {
      await client.query('BEGIN');
      const result = await action({ credit: new SqlCreditRepository(client) });
      await client.query('COMMIT');
      return result;
    } catch (error) {
      try { await client.query('ROLLBACK'); } catch { discard = true; }
      throw error;
    } finally {
      client.release(discard);
    }
  }
}
