import { randomBytes } from 'node:crypto';
import { readFile, writeFile, chmod } from 'node:fs/promises';
import dotenv from 'dotenv';

const target = new URL('../.env', import.meta.url);
let text;
try { text = await readFile(target, 'utf8'); }
catch (error) {
  if (error.code !== 'ENOENT') throw error;
  text = await readFile(new URL('../.env.example', import.meta.url), 'utf8');
}
const existing = dotenv.parse(text);
for (const key of ['CREDIT_USER_SERVICE_TOKEN', 'CREDIT_ORDER_SERVICE_TOKEN']) {
  if (existing[key]) {
    if (existing[key].length < 32) throw new Error(`${key} must be at least 32 characters; existing credentials were not overwritten`);
    continue;
  }
  const line = `${key}=${randomBytes(32).toString('hex')}`;
  const pattern = new RegExp(`^${key}=.*$`, 'm');
  text = pattern.test(text) ? text.replace(pattern, line) : `${text.trimEnd()}\n${line}\n`;
}
await writeFile(target, text, { mode: 0o600 });
await chmod(target, 0o600);
console.log('Local credit credentials configured in grpc/.env. Existing settings and credentials were preserved.');
