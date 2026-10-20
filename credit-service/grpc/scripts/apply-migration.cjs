// AI Assistance Disclosure:
// Tool: OpenAI Codex (model: GPT-6), date: 2026-10-20 (Asia/Singapore).
// Scope: Generated a CLI to execute one explicit SQL migration using the human-selected pg driver.
// Author review: Pending human review.
// Prompts and key responses: ../../ai/usage-log.md, entry 005.
// AI-generated; human review pending.

const { readFile } = require('node:fs/promises');
const { extname, resolve, basename } = require('node:path');
const { Client } = require('pg');

async function main() {
  const filename = process.argv[2];
  if (process.argv.length !== 3 || extname(filename || '') !== '.sql') {
    throw new Error('Usage: npm run db:migrate -- <migration.sql>');
  }
  if (!process.env.PGDATABASE) {
    throw new Error('Set PGDATABASE explicitly before applying a migration.');
  }

  const sql = await readFile(resolve(filename), 'utf8');
  const client = new Client({ connectionTimeoutMillis: 5000 });
  try {
    await client.connect();
    await client.query('BEGIN');
    try {
      await client.query(sql);
      await client.query('COMMIT');
    } catch (error) {
      try {
        await client.query('ROLLBACK');
      } catch (rollbackError) {
        throw new AggregateError([error, rollbackError], 'Migration and rollback failed.');
      }
      throw error;
    }
    console.log('Applied migration: ' + basename(filename));
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error('Migration failed:', error.message);
  process.exitCode = 1;
});
