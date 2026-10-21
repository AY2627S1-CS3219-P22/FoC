// Tests an unmerged Credit branch without switching or merging this checkout.
const { execFileSync, spawnSync } = require('node:child_process');
const { mkdtempSync, mkdirSync, symlinkSync, rmSync } = require('node:fs');
const { tmpdir } = require('node:os');
const path = require('node:path');
const root = path.resolve(__dirname, '../..');
const ref = process.argv[2] || 'origin/feat/credit-implementation';
if (!process.env.TEST_DATABASE_URL || !process.env.CREDIT_TEST_DATABASE_URL) {
  throw new Error('Set dedicated TEST_DATABASE_URL and CREDIT_TEST_DATABASE_URL first');
}
const temporary = mkdtempSync(path.join(tmpdir(), 'foc-credit-compat-'));
function run(args, cwd = root) {
  execFileSync(process.execPath, args, { cwd, env: process.env, stdio: 'inherit' });
}
try {
  console.log('Testing Credit commit:', execFileSync('git', ['rev-parse', ref], { cwd: root, encoding: 'utf8' }).trim());
  const archive = execFileSync('git', ['archive', ref, 'credit-service', 'shared/grpc', 'user-service/proto'], { cwd: root });
  const unpack = spawnSync('tar', ['-x', '-C', temporary], { input: archive, stdio: ['pipe', 'inherit', 'inherit'] });
  if (unpack.error) throw unpack.error;
  if (unpack.status !== 0) throw new Error('Could not export Credit source');
  symlinkSync(path.join(root, 'node_modules'), path.join(temporary, 'node_modules'), 'dir');
  const creditRoot = path.join(temporary, 'credit-service');
  mkdirSync(path.join(creditRoot, 'node_modules/@foc'), { recursive: true });
  symlinkSync(path.join(temporary, 'shared/grpc'), path.join(creditRoot, 'node_modules/@foc/grpc'), 'dir');
  const compiler = path.join(root, 'node_modules/typescript/bin/tsc');
  run([compiler, '-p', path.join(temporary, 'shared/grpc/tsconfig.json')]);
  run([compiler, '-p', path.join(creditRoot, 'tsconfig.json')]);
  process.env.CREDIT_IMPLEMENTATION_ROOT = creditRoot;
  run(['--import', 'tsx', '--test', 'order-service/tests/creditCompatibility.integration.test.ts']);
} finally {
  rmSync(temporary, { recursive: true, force: true });
}
