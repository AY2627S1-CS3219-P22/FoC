import 'dotenv/config';
import { createHash } from 'node:crypto';
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import type { Pool } from 'pg';
import { createPool } from './database';

export async function migrate(pool: Pool): Promise<void> {
  const directory = path.resolve(__dirname, '../../db/migrations');
  const files = (await readdir(directory)).filter(file => file.endsWith('.sql')).sort();
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query("SELECT pg_advisory_xact_lock(hashtextextended('foc.credit.migrations', 0))");
    await client.query('CREATE SCHEMA IF NOT EXISTS credit');
    await client.query(`CREATE TABLE IF NOT EXISTS credit.schema_migrations
      (name text PRIMARY KEY, checksum char(64) NOT NULL, applied_at timestamptz NOT NULL DEFAULT now())`);
    for (const name of files) {
      const sql = await readFile(path.join(directory, name), 'utf8');
      const checksum = createHash('sha256').update(sql).digest('hex');
      const previous = await client.query<{ checksum: string }>('SELECT checksum FROM credit.schema_migrations WHERE name = $1', [name]);
      if (previous.rows[0]) {
        if (previous.rows[0].checksum !== checksum) throw new Error(`Applied migration ${name} was modified; create a new migration instead`);
        continue;
      }
      await client.query(sql);
      await client.query('INSERT INTO credit.schema_migrations(name, checksum) VALUES ($1, $2)', [name, checksum]);
    }
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

if (require.main === module) {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL is required');
  const pool = createPool(url);
  migrate(pool).then(() => console.log('Credit migrations applied')).catch(error => {
    console.error(error);
    process.exitCode = 1;
  }).finally(() => pool.end());
}
