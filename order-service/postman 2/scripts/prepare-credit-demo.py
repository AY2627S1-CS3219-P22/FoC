# AI Assistance Disclosure: ChatGPT (Codex), 2026-10-23.
# Scope: Corrected local output location and added ready-to-import credential environment.
# Human review pending; see ../../usage-log.md.
"""Prepare local environments for the Credit REST and Credit gRPC collections.

Accounts A/B/C are registered through User Service; their Credit accounts are
created by the user.created event. D is a signed token for a user that was never
registered, so it has no Credit account. Never resets databases or stops services.
"""

import argparse
import json
import os
from pathlib import Path
import subprocess
import sys
import time
from urllib.error import HTTPError
from urllib.request import Request, urlopen
from uuid import uuid4

ROOT = Path(__file__).resolve().parents[3]
ENVIRONMENTS = Path(__file__).resolve().parents[1] / ".runtime-local"


def http(method, url, body=None, token=None, expected=200):
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = "Bearer " + token
    request = Request(url, data=None if body is None else json.dumps(body).encode(),
                      method=method, headers=headers)
    try:
        with urlopen(request, timeout=15) as response:
            code, payload = response.status, json.load(response)
    except HTTPError as error:
        code, payload = error.code, json.load(error)
    if code != expected:
        raise RuntimeError(f"{method} {url}: expected {expected}, received {code}; check service setup")
    return payload


def env_path(suite):
    return ENVIRONMENTS / f"credit-{suite}.local.environment.yaml"


def save(path, values, suite):
    doc = {"name": f"order-service: Credit {suite.upper()} demo", "values": [
        {"key": key, "value": str(value), "enabled": True} for key, value in values.items()
    ]}
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text("# AI Assistance Disclosure: ChatGPT (Codex), 2026-10-23; local synthetic fixture; human review pending; see order-service/usage-log.md.\n" + json.dumps(doc, indent=2) + "\n")
    web = {**doc, "_postman_variable_scope": "environment", "_postman_exported_using": "Local synthetic fixture; AI disclosure: WEB-IMPORT.md and Order usage-log.md"}
    web_path = path.with_suffix(".postman_environment.json")
    web_path.write_text(json.dumps(web, indent=2) + "\n")
    web_path.chmod(0o600)
    path.chmod(0o600)


def load(suite):
    path = env_path(suite)
    if not path.exists():
        raise RuntimeError(f"Run prepare-credit-demo.py {suite} first")
    data = json.loads("\n".join(line for line in path.read_text().splitlines() if not line.startswith("#")))
    return path, {entry["key"]: str(entry.get("value", "")) for entry in data["values"]}


def node(script, stdin=""):
    return subprocess.run(["node", "-e", script], input=stdin, text=True, cwd=ROOT,
                          capture_output=True, check=True).stdout


def sign_unregistered_token(user_id):
    # Same RS256 key pair the User Service signs with; this user is never registered.
    key = os.environ.get("USER_PRIVATE_KEY_PATH", str(ROOT / "user-service" / "keys" / "private.pem"))
    script = r'''
const jwt = require('jsonwebtoken');
const { key, sub } = JSON.parse(require('node:fs').readFileSync(0, 'utf8'));
process.stdout.write(jwt.sign({ sub, roles: ['USER'] }, require('node:fs').readFileSync(key), { algorithm: 'RS256', expiresIn: '1d' }));
'''
    return node(script, json.dumps({"key": key, "sub": user_id}))


def history(values, actor="A"):
    return http("GET", values["creditBaseUrl"] + "/credits/me/history?pageSize=100",
                token=values[actor + "Token"])


def wait_for_account(values, actor, timeout=20):
    deadline = time.time() + timeout
    while time.time() < deadline:
        try:
            return http("GET", values["creditBaseUrl"] + "/credits/me/balance", token=values[actor + "Token"])
        except RuntimeError as error:
            if "received 404" not in str(error):
                raise
            time.sleep(0.5)
    raise RuntimeError(f"{actor} has no Credit account after {timeout}s; check the User outbox and Credit listener")


def prepare(suite):
    path = env_path(suite)
    if path.exists():
        raise RuntimeError("Environment already exists. Remove it to prepare fresh users")
    values = {
        "userBaseUrl": os.environ.get("USER_BASE_URL", "http://localhost:3001"),
        "creditBaseUrl": os.environ.get("CREDIT_BASE_URL", "http://localhost:3004"),
        "creditGrpcUrl": os.environ.get("CREDIT_GRPC_ADDR", "localhost:50054"),
        "creditServiceToken": os.environ.get("CREDIT_ORDER_SERVICE_TOKEN", "local_order_credit_token"),
        "demoPassword": "CreditDemo!2026",
    }
    tag = uuid4().hex[:12]
    for actor in "ABC":
        email = f"credit-demo-{tag}-{actor.lower()}@u.nus.edu"
        profile = http("POST", values["userBaseUrl"] + "/users/register", {
            "firstName": "CreditDemo", "lastName": actor,
            "username": f"credit-demo-{tag}-{actor.lower()}", "email": email,
            "password": values["demoPassword"],
        }, expected=201)
        token = http("POST", values["userBaseUrl"] + "/users/login", {
            "email": email, "password": values["demoPassword"],
        })["token"]
        values[actor + "Id"], values[actor + "Token"], values[actor + "Email"] = profile["user"]["id"], token, email
    values["DId"] = str(uuid4())
    values["DToken"] = sign_unregistered_token(values["DId"])
    for actor in "ABC":
        expected = {"userId": values[actor + "Id"], "totalCredits": 10,
                    "reservedCredits": 0, "availableCredits": 10}
        if wait_for_account(values, actor) != expected:
            raise RuntimeError(f"{actor} did not start with the expected credit balance")
    http("GET", values["creditBaseUrl"] + "/credits/me/balance", token=values["DToken"], expected=404)
    if history(values, "D") != {"entries": [], "nextPageToken": None}:
        raise RuntimeError("D must have no Credit history")
    baseline = history(values)
    if len(baseline["entries"]) != 1 or baseline["entries"][0]["type"] != "INITIAL_GRANT":
        raise RuntimeError("A must begin with exactly one initial grant")
    values["ABaselineHistory"] = json.dumps(baseline, separators=(",", ":"))
    for key in ["grpcOrder", "grpcSettleOrder", "unknownOrder", "missingAccount"]:
        values[key] = str(uuid4())
    save(path, values, suite)
    print(f"Prepared {suite}: A/B/C each have 10 credits from registration; D has no account.")
    print(f"Local Postman environment: {path.relative_to(ROOT)}")


def reseed(suite):
    # Replays user.created for A on Credit's real queue; Credit must not grant twice.
    path, values = load(suite)
    before = history(values)
    script = r'''
const { randomUUID } = require('node:crypto');
const { RabbitMQClient, CREDIT_USER_QUEUE } = require('@foc/messaging');
const userId = require('node:fs').readFileSync(0, 'utf8');
(async () => {
  const broker = new RabbitMQClient({ url: process.env.RABBITMQ_URL || 'amqp://guest:guest@localhost:5672',
    prefetch: 10, serviceName: 'credit-demo-replay', logDir: require('node:os').tmpdir() + '/credit-demo-replay' });
  try {
    await broker.connect();
    const eventId = randomUUID();
    const sent = await broker.publishToQueue(CREDIT_USER_QUEUE,
      { type: 'user.created', eventId, occurredAt: new Date().toISOString(), userId }, eventId);
    if (!sent) throw new Error('Event publication was not confirmed');
  } finally { await broker.close(); }
})().catch(error => { console.error(error.message); process.exitCode = 1; });
'''
    node(script, values["AId"])
    time.sleep(3)
    if history(values) != before:
        raise RuntimeError("Replayed user.created changed A's history")
    if http("GET", values["creditBaseUrl"] + "/credits/me/balance", token=values["AToken"])["totalCredits"] != 10:
        raise RuntimeError("Replayed user.created changed A's total")
    values["duplicateSeedVerified"] = "true"
    save(path, values, suite)
    print("PASS: replayed user.created for A changed neither balance nor history")


def paging(suite):
    path, values = load(suite)
    if values.get("pagingPrepared") == "true":
        raise RuntimeError("Paging fixtures already prepared; prepare fresh users before rerunning")
    if history(values) != json.loads(values["ABaselineHistory"]):
        raise RuntimeError("Prepare paging immediately after the REST baseline/reseed stages")
    # 26 reserve/release pairs + INITIAL_GRANT = 53 history rows, final balance 10/0.
    script = r'''
const { Metadata } = require('@grpc/grpc-js');
const { createCreditClient } = require('@foc/grpc');
const { randomUUID } = require('node:crypto');
const input = JSON.parse(require('node:fs').readFileSync(0, 'utf8'));
(async () => {
  const credit = createCreditClient(input.creditGrpcUrl);
  const metadata = new Metadata();
  metadata.set('x-credit-service-token', input.creditServiceToken);
  try {
    for (let i = 0; i < 26; i += 1) {
      const orderId = randomUUID();
      await credit.reserveCredits({ orderId, requesterId: input.AId, amount: 1 }, { metadata });
      await credit.releaseCredits({ orderId }, { metadata });
    }
  } finally { credit.close(); }
})().catch(error => { console.error(error.code, error.details); process.exitCode = 1; });
'''
    node(script, json.dumps(values))
    # Read the internal ordering from PostgreSQL; sequence IDs are not REST fields.
    if not os.environ.get("PGDATABASE"):
        raise RuntimeError("Set PGDATABASE and the Credit PG connection variables to verify history order")
    query = r'''
const { Client } = require('pg');
const userId = require('node:fs').readFileSync(0, 'utf8');
(async () => {
  const db = new Client({ connectionTimeoutMillis: 5000 });
  try {
    await db.connect();
    const { rows } = await db.query('SELECT id FROM credit_history WHERE user_id = $1 ORDER BY sequence_id DESC', [userId]);
    process.stdout.write(JSON.stringify(rows.map(row => row.id)));
  } finally { await db.end(); }
})().catch(error => { console.error(error.message); process.exitCode = 1; });
'''
    expected_ids = json.loads(node(query, values["AId"]))
    if len(expected_ids) != 53:
        raise RuntimeError("Expected exactly 53 paging fixture rows")
    values["pagingPrepared"] = "true"
    values["pagingExpectedIds"] = json.dumps(expected_ids)
    save(path, values, suite)
    print("Prepared 53 rows through Credit RPCs; A still has 10 total and 0 reserved")


def refresh(suite):
    path, values = load(suite)
    for actor in "ABC":
        values[actor + "Token"] = http("POST", values["userBaseUrl"] + "/users/login", {
            "email": values[actor + "Email"], "password": values["demoPassword"],
        })["token"]
    values["DToken"] = sign_unregistered_token(values["DId"])
    save(path, values, suite)
    print("Refreshed all four tokens; reselect/reload the local environment in Postman")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("suite", choices=["rest", "grpc"])
    parser.add_argument("--action", choices=["prepare", "reseed", "paging", "refresh"], default="prepare")
    args = parser.parse_args()
    try:
        {"prepare": prepare, "reseed": reseed, "paging": paging, "refresh": refresh}[args.action](args.suite)
    except Exception as error:
        print(f"Demo preparation failed: {error}", file=sys.stderr)
        sys.exit(1)
