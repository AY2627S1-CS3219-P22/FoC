const { readFileSync } = require('node:fs');
const { Client, credentials } = require('@grpc/grpc-js');
const { Pool } = require('pg');

// Readiness: the gRPC listener completes its (TLS) handshake and the migrated database answers.
// No RPC is called, so probes need no service credential and add no access-audit entries.
const cert = process.env.CREDIT_TLS_CERT_PATH;
const client = new Client(`localhost:${process.env.GRPC_PORT || 50053}`,
  cert ? credentials.createSsl(readFileSync(cert)) : credentials.createInsecure());
const pool = new Pool({ connectionString: process.env.DATABASE_URL, connectionTimeoutMillis: 2000, max: 1 });
const listening = new Promise((resolve, reject) =>
  client.waitForReady(Date.now() + 3000, error => (error ? reject(error) : resolve())));

Promise.all([listening, pool.query('SELECT 1 FROM credit.schema_migrations LIMIT 1')])
  .then(() => { process.exitCode = 0; }, () => { process.exitCode = 1; })
  .finally(() => { client.close(); return pool.end(); });
