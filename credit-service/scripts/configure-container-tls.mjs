import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

// Local-only self-signed certificate for the Compose stack. Use CA-issued certificates in deployment.
const directory = fileURLToPath(new URL('../keys/', import.meta.url));
const cert = `${directory}server-cert.pem`;
const key = `${directory}server-key.pem`;
if (existsSync(cert) && existsSync(key)) {
  console.log('Local credit TLS certificate already exists in credit-service/keys; it was not replaced.');
} else {
  mkdirSync(directory, { recursive: true });
  execFileSync('openssl', ['req', '-x509', '-newkey', 'rsa:2048', '-nodes', '-days', '365', '-subj', '/CN=credit-service',
    '-addext', 'subjectAltName=DNS:localhost,DNS:credit-service,IP:127.0.0.1', '-keyout', key, '-out', cert], { stdio: 'ignore' });
  console.log('Local credit TLS certificate written to credit-service/keys (git-ignored).');
}
