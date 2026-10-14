const { createCreditClient } = require('@foc/grpc');
const { status } = require('@grpc/grpc-js');

const client = createCreditClient(`127.0.0.1:${process.env.GRPC_PORT || 50053}`, { timeoutMs: 2000 });
// This infrastructure branch packages the existing UNIMPLEMENTED scaffold.
client.getBalance({ userId: 'healthcheck' })
  .then(() => { process.exitCode = 1; })
  .catch(error => { process.exitCode = error.code === status.UNIMPLEMENTED ? 0 : 1; })
  .finally(() => client.close());
