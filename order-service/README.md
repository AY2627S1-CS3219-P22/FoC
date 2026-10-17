# Order Service

The current implementation contains a gRPC scaffold and a tested
[race-policy component](docs/race-policy.md). The lifecycle/database owner should
use that component when integrating create/edit/accept/cancel/expiry handlers.

Build from the repository root with `npm run build`, then run
`npm run test --workspace @foc/order-grpc` for the policy tests.
