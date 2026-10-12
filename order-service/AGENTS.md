# Order Service

The tested `grpc/src/services/order-race-policy.ts` component defines priority among
pending intents. Follow `docs/race-policy.md` when wiring lifecycle/database handlers:
use a persistent shared queue, lock/version the order, and persist the decision and
credit work before dispatch. Calling the policy separately for each request does
not enforce priority across competing requests.
