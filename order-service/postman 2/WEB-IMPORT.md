<!-- AI Assistance Disclosure: ChatGPT (Codex), 2026-10-23 Asia/Singapore.
Scope: Teammate collection conversion instructions; human review pending.
Exact prompt/checks: ../usage-log.md. -->
# Postman Web exports

Open `web-import/` and import its `*.postman_collection.json` files and the
matching `*.postman_environment.json` file into Postman Web. Use Desktop Agent
for localhost. Collections have `(postman 2)` in their imported names.

Match environment to collection: Order + Credit uses order-credit; Credit REST
uses credit-rest; Order live demo uses demo. Keep each suite's accounts, balances
and ledger state separate. Source preparation scripts and prerequisites still
apply; the exporter does not prepare accounts, initialize fixtures or start
containers. Source request bodies/assertions were preserved, not verified
against running services. Check the original setup instructions for each suite.

All exported tokens, service credentials, account IDs and fixture state are
blank. Base addresses, supplier selection and synthetic demo password settings
are retained. Fill credentials locally or use the suite's own login/setup
requests. Account-specific Credit REST fixtures cannot be restored merely by
importing this blank environment. Never publish populated environments.

Run requests manually in numbered order. Respect folders labelled STOP Credit
and START Credit: these are manual runtime checkpoints, not commands executed
by the collection. Do not run every folder uninterrupted. The export does not
correct mismatches between teammate assumptions and the current backend.

## Native gRPC

The Credit gRPC requests are retained under `web-import/native-grpc/` as YAML.
This converter does not encode them as HTTP or claim a v2.1 JSON collection can
execute them. Use their native desktop local workflow. No executable gRPC JSON
collection was generated. Their schema reference still points to
`shared/grpc/proto/credit.proto` relative to the repository root.

## Regenerate

```sh
python3 'order-service/postman 2/export-web.py'
```

Requires Python 3, Ruby's YAML/JSON standard libraries, and Node. Source YAML
requests and environments remain unchanged. JSON attribution, approved by the
human for Web exports, is recorded in collection descriptions and this file and
Order usage-log.md. Tool: ChatGPT (Codex), date: 2026-10-23; human review pending.

Verification: exported HTTP scripts parse using node --check. No Postman import,
runner execution, live API assertions, or full schema validation claimed.

## Correcting 401s and preparing actual Credit REST fixtures

Blank exports contain no authentication or account-specific fixture state.
Use the prepared local environment, not a blank template, for Credit REST:

```sh
python3 'order-service/postman 2/scripts/prepare-credit-demo.py' rest
```

This writes ignored `.runtime-local/credit-rest.local.environment.postman_environment.json`
with synthetic demo credentials and baseline history. Import that environment,
select it, and run **01 Initial reads only**. Before folder 02 run:

```sh
python3 'order-service/postman 2/scripts/prepare-credit-demo.py' rest --action reseed
```

Reimport the updated runtime environment, then run folder 02. Before folder 03:

```sh
export PGHOST=127.0.0.1 PGPORT=5434 PGDATABASE=credit_service PGUSER=credit_service
export PGPASSWORD=credit_service_local
python3 'order-service/postman 2/scripts/prepare-credit-demo.py' rest --action paging
```

Reimport the updated runtime environment, then run folder 03. Do not rerun
folder 01's single-initial-grant assertions after paging fixtures are created.
A populated runtime environment must stay local; do not publish or commit it.

For expired tokens run the preparation helper with `--action refresh` and
reimport its runtime JSON. Exported HTTP collections also now check referenced
student tokens before sending protected requests and can log back in when the
selected environment supplies the corresponding email and demo password.
Intentional missing/garbage-token requests remain unchanged. Missing setup now
produces an explicit pre-request diagnostic instead of unexplained 401 failures.

The active local Credit demo database was verified empty and migrations 001–009
were applied on 2026-10-23. Do not blindly reapply them to existing databases.
