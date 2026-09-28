import 'dotenv/config';
import fs from 'node:fs';
import { z } from 'zod';

// Validate config at boot so we fail fast with a clear message.
const schema = z.object({
  DATABASE_URL: z.url(),
  PORT: z.coerce.number().int().positive().default(3001),
  GRPC_PORT: z.coerce.number().int().positive().default(50052),

  // JWT (RS256): user-service signs with the private key; every service (incl.
  // Supplier) verifies with the public key. Keys are loaded from file paths to
  // avoid multi-line PEM in .env — see DECISIONS.md D8.
  JWT_PRIVATE_KEY_PATH: z.string().min(1),
  JWT_PUBLIC_KEY_PATH: z.string().min(1),
  JWT_EXPIRES_IN: z.string().default('15m'),
});

const parsed = schema.safeParse(process.env);
if (!parsed.success) {
  console.error('Invalid environment configuration:');
  console.error(z.flattenError(parsed.error).fieldErrors);
  process.exit(1);
}

export const env = parsed.data;

// Load the PEM key files once at boot. Fail fast with a clear message if a path
// is set but the file is missing/unreadable.
function readKey(filePath: string, label: string): string {
  try {
    return fs.readFileSync(filePath, 'utf8');
  } catch {
    console.error(`Cannot read ${label} at "${filePath}". Generate the keypair (see README) or fix the path.`);
    process.exit(1);
  }
}

export const jwtPrivateKey = readKey(env.JWT_PRIVATE_KEY_PATH, 'JWT_PRIVATE_KEY_PATH');
export const jwtPublicKey = readKey(env.JWT_PUBLIC_KEY_PATH, 'JWT_PUBLIC_KEY_PATH');
