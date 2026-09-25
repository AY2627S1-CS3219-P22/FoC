import path from 'node:path';
import {
  Server,
  ServerCredentials,
  loadPackageDefinition,
  status,
  type ServerUnaryCall,
  type sendUnaryData,
  type UntypedServiceImplementation,
} from '@grpc/grpc-js';
import { loadSync } from '@grpc/proto-loader';

const PROTO_PATH = path.resolve(__dirname, '../../proto/user.proto');

const packageDefinition = loadSync(PROTO_PATH, {
  keepCase: false,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true,
});

const proto = loadPackageDefinition(packageDefinition) as any;

const userServiceImpl: UntypedServiceImplementation = {
  // F2.6 — other services fetch a user's public profile by ID.
  // TODO: look up the user in Postgres via Prisma and map to PublicProfile.
  getPublicProfile(
    _call: ServerUnaryCall<unknown, unknown>,
    callback: sendUnaryData<unknown>,
  ): void {
    callback({ code: status.UNIMPLEMENTED, details: 'GetPublicProfile not implemented yet' });
  },
};

export function createGrpcServer(): Server {
  const server = new Server();
  server.addService(proto.user.UserService.service, userServiceImpl);
  return server;
}

export function startGrpcServer(port: number): Promise<Server> {
  const server = createGrpcServer();
  return new Promise((resolve, reject) => {
    // TODO(prod): no TLS here, add encryption before cloud deployment.
    server.bindAsync(`0.0.0.0:${port}`, ServerCredentials.createInsecure(), (err) => {
      if (err) return reject(err);
      resolve(server);
    });
  });
}
