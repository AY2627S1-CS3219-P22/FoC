const { cpSync, mkdirSync } = require('node:fs');
const path = require('node:path');

// TypeScript emits application code, but not Prisma's generated JS/engine.
const serviceRoot = path.resolve(__dirname, '..');
mkdirSync(path.join(serviceRoot, 'dist/generated'), { recursive: true });
cpSync(path.join(serviceRoot, 'src/generated/prisma'), path.join(serviceRoot, 'dist/generated/prisma'), {
  recursive: true,
});
