# PaySentinel AI: Remaining Work (agent task list)

Generated from a review of `paypal-AI.zip` on 2026-11-11. Same `## Task N:` convention as `PRD.md` and `prompt.md`, so it can replace `PRD.md` and be driven by the existing Ralph loop (one task per iteration, log to `progress.txt`).

## Ground rules for the executing agent

1. Do exactly one task per iteration, in numeric order unless a task says otherwise. Dependencies are listed per task.
2. Red-green: write a failing test first and save the log to `verification/<TASK_ID>_red.log`. After the fix, save the passing run to `verification/<TASK_ID>_pytest.log`. This matches the repo's own P0/P1/P2 convention.
3. Gate before marking done: `python -m compileall -q backend/app backend/tests`, `cd backend && pytest -q`, `cd frontend && npx tsc --noEmit && npm run lint && npm run build`, `bash scripts/check_secrets.sh`.
4. Never commit real credentials. Never claim a feature is LIVE in docs unless a test or smoke script exercises it. Use the existing `data_source` / `SIMULATED` tagging.
5. Files use CRLF line endings. Do not reformat whole files (Task 20 normalises this once).
6. Append `[YYYY-MM-DD HH:MM] Completed: Task N - <title>` to `progress.txt` when done.

## Baseline (verified in review)

- The backend installs and boots. `pytest` in `backend/` (default env, no `.env`): 101 passed and 4 failed in `tests/`, plus 2 passed in the root-level `test_*.py` files. The README and `FINAL_REPORT.md` claim "107 passing".
- Failing in default env: three tests in `tests/test_paypal_loop.py` (`test_provide_evidence_exact_multipart_request_shape`, `test_provide_evidence_status_check_and_type_validation`, `test_accept_claim_body_check_and_validation`) and `test_webhook_invalid_signature_rejection`. With `PAYPAL_MODE=sandbox` and dummy credentials, 7 other tests fail instead. Results depend on ambient environment variables, so the suite is not hermetic.
- The frontend was not built or run in this review. Its status is taken from the repo's `verification/` logs (build and tsc pass, 78 ESLint warnings).

---

## PRIORITY 0: Security and trust blockers

## Task 1: Close the frontend proxy privilege escalation
**Problem:** `frontend/src/app/api/proxy/[...path]/route.ts` picks the backend token from the client-supplied `x-reviewer-role` request header and defaults to `SENIOR_RISK_OFFICER`. Anyone who can reach the Next.js server can send `x-reviewer-role: ADMIN` and act as admin. This defeats maker-checker and the amount cap. It also falls back to hardcoded tokens (`tok_senior_risk_001`, `tok_operator_003`, `tok_admin_004`).
**Files:** `frontend/src/app/api/proxy/[...path]/route.ts`, `frontend/src/lib/api.ts`, `frontend/src/components/TopNav.tsx` and any role switcher, `frontend/src/app/layout.tsx`.
**Steps:**
1. Remove client control over the role. Add real login (for example NextAuth/Auth.js credentials or an OIDC provider) with a signed, httpOnly session cookie. The proxy derives the backend token from the session role.
2. Remove all hardcoded fallback tokens. If the required `PAYSENTINEL_API_TOKEN_*` env var is missing, return 500 with a clear message, with no default.
3. Do not forward arbitrary paths. Allowlist proxied path prefixes.
4. If a demo role switcher must stay for judges, gate it behind `PAYSENTINEL_DEMO_MODE=true` and show a visible banner. It must be impossible to enable with `NODE_ENV=production` unless explicitly overridden.
**Acceptance:** a request with `x-reviewer-role: ADMIN` and no session gets 401. A frontend test (route handler unit test) proves the header is ignored. The app starts with no fallback tokens.
**Depends on:** none.

## Task 2: Remove committed credentials and contradictory defaults
**Problem:** `render.yaml` ships `API_TOKENS` with concrete token values for all three roles. `backend/.env.example` ships `tok_admin_001`, `tok_risk_001` and `tok_op_001` as the defaults. The README says hardcoded default tokens are rejected, and the root README env block shows `ALLOW_UNSIGNED_WEBHOOKS=true` while `.env.example` says `false`.
**Files:** `render.yaml`, `backend/.env.example`, `README.md`, `scripts/check_secrets.sh`, `backend/app/core/auth.py`.
**Steps:**
1. In `render.yaml` set `API_TOKENS` and the frontend `PAYSENTINEL_API_TOKEN_*` to `sync: false` (or `generateValue: true` where suitable).
2. In `.env.example` use obviously-invalid placeholders such as `API_TOKENS=<generate: openssl rand -hex 32>:Alice:SENIOR_RISK_OFFICER`.
3. In `auth.py`, reject any configured token matching a denylist of known-weak patterns (`tok_admin_`, `tok_risk_`, `tok_op_`, `tok_senior_`, `tok_operator_`) or shorter than 32 characters, when `APP_ENV` is not `development`.
4. Extend `check_secrets.sh` to fail on `tok_[a-z]+_\d+` patterns in tracked files.
5. Fix the README env block to match `.env.example`. Treat the tokens currently in git history as burned.
**Acceptance:** `check_secrets.sh` fails when a `tok_*_001` string is reintroduced. A test shows production boot fails with a weak token. Docs match `.env.example`.
**Depends on:** Task 1.

## Task 3: Default-deny authentication on all non-public routes
**Problem:** Many state-revealing or cost-incurring routes have no auth dependency: `POST /api/agent-commerce/run` (creates PayPal orders), `POST /api/arena/run` and `/evaluate-attack` (LLM spend), `POST /api/transactions/nl-query`, `GET /api/paypal/orders/{id}`, `GET /api/disputes` and `/{id}`, `GET /api/webhooks/events`, `POST /api/webhooks/zapier/dispatch`, `POST /api/control-tower/audit/elastic-search` (exposes audit log), `GET /api/control-tower/pending` and `/{id}`, `GET /api/proofs`.
**Files:** `backend/app/main.py`, all files in `backend/app/routers/`, `backend/app/core/auth.py`.
**Steps:**
1. Apply `Depends(get_current_reviewer)` at `app.include_router(..., dependencies=[...])` level for every router.
2. Maintain an explicit `PUBLIC_ROUTES` allowlist: `/health`, `/api/health`, `/`, `POST /api/webhooks/paypal` (signature-verified instead), `GET /api/proofs/public-key`, and `/docs` only in development.
3. Add role rules: read endpoints need any authenticated role. Money-moving or LLM-spending endpoints need OPERATOR or higher. Audit search needs SENIOR_RISK_OFFICER or ADMIN.
4. Add a test that iterates `app.routes` and fails if any non-allowlisted route returns anything but 401 without a token.
**Acceptance:** the route-enumeration test passes. The existing smoke script still passes. The frontend proxy still works for logged-in sessions.
**Depends on:** Task 1.

## Task 4: Make the test suite hermetic
**Problem:** There is no `conftest.py`. Tests read ambient env and `.env`, so results differ by machine (see Baseline). `pytest.ini` has `testpaths = tests`, which skips `backend/test_agent_commerce.py` and `backend/test_control_tower.py`.
**Files:** new `backend/tests/conftest.py`, `backend/pytest.ini`, move the two root-level tests into `tests/`, `.github/workflows/verify.yml`.
**Steps:**
1. In `conftest.py`, set a clean env before importing the app. Use a fresh temp SQLite path (parameterise `DB_PATH` via env), a temp `SIGNING_KEY_DIR`, a fixed test `API_TOKENS`, and `PAYPAL_MODE=simulated` by default. Provide fixtures to switch to sandbox mode with `httpx.MockTransport`.
2. Ensure no test can make real network calls. Fail on any unmocked `httpx` request unless marked `@pytest.mark.live`.
3. Fix the four failing tests so they pass in both a clean env and a developer env with a populated `.env`.
4. Move the root-level tests into `tests/`.
5. Add CI jobs: one clean-env run, one with dummy sandbox credentials set.
**Acceptance:** `pytest -q backend` is green in an empty environment and with `PAYPAL_MODE=sandbox PAYPAL_CLIENT_ID=x PAYPAL_CLIENT_SECRET=y PAYPAL_WEBHOOK_ID=w`. Update the README test count to the real number.
**Depends on:** none (can run in parallel with Task 1).

---

## PRIORITY 1: Make "live" claims true

## Task 5: Implement real PayPal transaction sync
**Problem:** `PayPalSandboxClient.sync_sandbox_orders()` in `backend/app/services/paypal_client.py` ignores credentials and returns `mock_data.get_transactions()`. `POST /api/paypal/sync` therefore never syncs anything. `PRD.md` Task 3 assumed a list endpoint at `/v2/checkout/orders`, but Orders v2 has no list endpoint (orders are fetched by ID only).
**Files:** `backend/app/services/paypal_client.py`, `backend/app/routers/paypal.py`, `backend/app/routers/transactions.py`, `backend/app/db.py`, `backend/app/models/schemas.py`.
**Steps:**
1. Create a `transactions` table. Persist every order created or captured through this app (the app already calls create and capture) and every `PAYMENT.CAPTURE.COMPLETED` webhook.
2. Add optional Transaction Search API support (`GET /v1/reporting/transactions` with `start_date` and `end_date`, which has a date-range limit and indexing delay and requires the scope to be enabled on the app). Gate it behind a flag and handle the "scope not enabled" error cleanly.
3. `sync_sandbox_orders()` returns real rows in sandbox mode and mock rows only in simulated mode. Tag each row with `data_source`.
4. `GET /api/transactions` reads from the DB, merged with mock only in simulated mode.
**Acceptance:** with `MockTransport`, a sync populates the DB and the API returns those rows tagged `LIVE`. In simulated mode rows are tagged `SIMULATED`. No code path returns mock data when `PAYPAL_MODE=sandbox`.
**Depends on:** Task 4.

## Task 6: Replace mock-backed dashboard, cashflow and disputes endpoints
**Problem:** `dashboard.py`, `cashflow.py` and `disputes.py` return `mock_data` directly. `/api/cashflow/runway` is entirely fabricated numbers, but the frontend presents it as live metrics.
**Files:** `backend/app/routers/dashboard.py`, `cashflow.py`, `disputes.py`, `backend/app/services/mock_data.py`, new `backend/app/services/metrics_service.py`, matching frontend pages.
**Steps:**
1. Compute dashboard stats from the `transactions` table (Task 5) and control tower items (open disputes, amounts at risk, win and loss counts).
2. Compute cash-flow runway from real captured balance and open-dispute exposure. Document the formula in the docstring and show `data_source`.
3. `GET /api/disputes` should list disputes from the control tower and the dispute provider, not the static list.
4. Keep `mock_data.py` only as the simulated-mode seed and as test fixtures.
5. Make every page show `DataSourceBadge` driven by the response `data_source`.
**Acceptance:** after ingesting a webhook dispute in tests, the dashboard count and the disputes list change. In sandbox mode with an empty DB the endpoints return zeros, not demo data.
**Depends on:** Task 5.

## Task 7: Complete webhook event coverage
**Problem:** `webhooks.py` handles `CUSTOMER.DISPUTE.CREATED` fully, but `PAYMENT.CAPTURE.COMPLETED` and `CUSTOMER.DISPUTE.RESOLVED` are one-line branches, and `CUSTOMER.DISPUTE.UPDATED` (buyer replies, status changes) is not handled. Dedupe by `event_id` is already persisted and works.
**Files:** `backend/app/routers/webhooks.py` (lines near 299 to 560), `backend/app/services/control_tower_service.py`, `backend/app/db.py`.
**Steps:**
1. `CUSTOMER.DISPUTE.UPDATED`: fetch the dispute, update the matching control tower item (status, new buyer messages). Re-run the firewall on new buyer text.
2. `CUSTOMER.DISPUTE.RESOLVED`: close the item with outcome (won, lost, accepted), write an audit entry, and stop any pending submission.
3. `PAYMENT.CAPTURE.COMPLETED`, `REFUNDED` and `REVERSED`: write to `transactions` (Task 5).
4. Store the seller response due date from the dispute payload and surface it as an SLA field on queue items, with an "overdue" flag.
5. Unknown event types: record and return 200, never 5xx.
**Acceptance:** tests post signed sample payloads (signature verification mocked) for each event and assert state, audit-chain integrity, and idempotent replay.
**Depends on:** Tasks 4 and 5.

## Task 8: Persistence and deployment correctness
**Problem:** Production deploy config will lose data. SQLite lives at `backend/data/paysentinel.db` and Ed25519 keys at `keys/`. On Render free plan the disk is ephemeral, so every redeploy wipes the audit chain and regenerates the signing key, which makes previously issued proofs unverifiable. Other config drift: `render.yaml` pins `PYTHON_VERSION 3.11.0` while CI uses 3.12, `AI_MODEL` is `gemini-2.0-flash` there but `gemini-2.5-flash` in `.env.example`, and `NEXT_PUBLIC_API_URL` uses `fromService ... property: host`, which returns a bare host with no scheme and is not reachable from client code anyway.
**Files:** `render.yaml`, `backend/app/db.py`, `backend/app/services/proof_engine.py`, `backend/app/core/config.py`, `README.md`.
**Steps:**
1. Make `DB_PATH` configurable (`DATABASE_URL` or `DB_PATH`). Either attach a Render persistent disk with a paid plan, or migrate to Postgres through a thin repository layer. Add a simple migration mechanism (versioned SQL files) instead of ad-hoc `ALTER TABLE` in `init_db`.
2. Load the signing key from a secret env var (`SIGNING_PRIVATE_KEY_B64`) in production and refuse to generate a new key at runtime when `APP_ENV=production`. Expose a key ID in proofs so key rotation does not break old proofs.
3. Align Python versions (3.12), `AI_MODEL`, and fix the frontend to use `BACKEND_INTERNAL_URL` (server-side) with an explicit `https://` URL.
4. Add a `Dockerfile` for backend and frontend plus a `docker-compose.yml` for local dev.
**Acceptance:** restart test proves audit chain and proof verification survive a process restart with an externally supplied key. Render blueprint validates and documents which values are secrets.
**Depends on:** Task 4.

## Task 9: Reconcile LLM provider claims with code
**Problem:** `Settings` and `/api/health` expose `openai_api_key` and `openai_active`, and `arena_engine.py` still has an OpenAI branch, but `FINAL_REPORT.md` says the OpenAI drafter was removed and the defense drafter is Gemini-only. Model names differ between README (`gemini-2.0-flash`), `.env.example` and `render.yaml`. No timeout, token-budget or cost cap is visible on the arena LLM calls.
**Files:** `backend/app/services/arena_engine.py`, `defense_drafter.py`, `backend/app/core/config.py`, `backend/app/main.py`, `README.md`.
**Steps:**
1. Decide on one policy: Gemini-only, or a proper `LLMProvider` interface with Gemini and OpenAI implementations used by both the arena and the drafter.
2. Add per-call timeout, `max_output_tokens`, retry with backoff, and a daily call budget (`LLM_DAILY_CALL_CAP`) that degrades to the deterministic path with a labelled `LLM_UNAVAILABLE` state.
3. Use one `AI_MODEL` default everywhere and update docs and health output.
4. Test: with no key, the arena returns clearly tagged deterministic output. With a mocked key, requests include the structured-output schema.
**Acceptance:** one documented provider story. Health output matches reality. The budget cap is tested.
**Depends on:** Task 3.

## Task 10: Rate limiting and abuse controls
**Problem:** There is no rate limiting or request size limit anywhere. The webhook endpoint, arena, and NL query are all open to flooding.
**Files:** `backend/app/main.py`, new `backend/app/core/ratelimit.py`.
**Steps:**
1. Add per-token and per-IP limits (for example `slowapi` or a small in-memory sliding window with a Redis option). Stricter limits on LLM-backed and order-creating routes.
2. Cap request body size (for example 1 MB, higher for evidence upload) and cap `nl-query` and arena input length.
3. Return 429 with `Retry-After`.
**Acceptance:** tests show the limit triggers and resets.
**Depends on:** Task 3.

---

## PRIORITY 2: Feature completion

## Task 11: Real live-sandbox end-to-end path for disputes
**Problem:** PayPal offers no API to create a dispute, so the live dispute path has never run against real data. `scripts/sandbox_smoke.py` only lists disputes and checks schema if any exist.
**Files:** `scripts/sandbox_smoke.py`, new `backend/tests/fixtures/paypal_webhooks/`, `SANDBOX_RUNBOOK.md`.
**Steps:**
1. Capture real sandbox `CUSTOMER.DISPUTE.CREATED`, `UPDATED` and `RESOLVED` payloads (redacted) after following the runbook once, and commit them as fixtures.
2. Replay fixtures through the webhook pipeline in tests, with signature verification mocked at the PayPal verify-webhook-signature call.
3. Extend the smoke script: if a dispute in `WAITING_FOR_SELLER_RESPONSE` exists, run provide-evidence against it behind an explicit `--submit` flag.
4. Add a contract test comparing parsed dispute models against the captured payloads.
**Acceptance:** replay tests green. The runbook records the exact steps and the date the fixtures were captured.
**Depends on:** Tasks 4 and 7. Needs a human to capture the first real payloads (mark `NEEDS_MANUAL`).

## Task 12: Make the Zapier and Elastic integrations real or relabel them
**Problem:** `POST /api/webhooks/zapier/dispatch` returns a "DISPATCHED" response but never sends anything to `webhook_url`. If it were made to, accepting an arbitrary URL from a query parameter is an SSRF risk. The "Elastic" endpoint is a keyword filter over SQLite shaped like an Elasticsearch response, not Elasticsearch.
**Files:** `backend/app/routers/webhooks.py`, `backend/app/routers/control_tower.py`, `zapier/README.md`, `README.md`.
**Steps:**
1. Zapier: read the target from an env-configured `ZAPIER_CATCH_HOOK_URL` only. Do not accept URLs from the request. POST asynchronously with timeout and retry. Fire it from real events (high-value dispute escalated, injection quarantined). Keep the manual dispatch route behind auth and in simulated mode only.
2. Elastic: either add an optional indexer (`ELASTICSEARCH_URL`) that ships audit entries and supports the query DSL subset you advertise, or rename the endpoint and README text to "Elastic-compatible response format over local audit log".
3. Update the Real vs Simulated matrix to state the truth for both.
**Acceptance:** tests with a mocked HTTP target prove the outbound call happens on a real event. The SSRF guard test proves user-supplied URLs are rejected.
**Depends on:** Task 3.

## Task 13: Carrier tracking behind a provider interface
**Problem:** Real tracking verification is out of scope today; evidence falls back to `NO_EVIDENCE` unless tracking bytes are supplied.
**Files:** new `backend/app/services/carrier_provider.py`, `proof_engine.py`, `webhooks.py`.
**Steps:** define `CarrierProvider.get_tracking(carrier, number)`. Add one real implementation (an aggregator API such as EasyPost, Shippo or 17TRACK, chosen by the owner) plus a `SimulatedCarrierProvider`. Feed the raw JSON response bytes into the Merkle leaf, never a summary.
**Acceptance:** with a mocked aggregator response, a leaf hash is computed from the raw bytes and tampering flips `VERIFIED` to `TAMPERED`. Skips cleanly without an API key.
**Depends on:** Task 4. Needs an owner decision on provider (mark `NEEDS_DECISION`).

## Task 14: Money as Decimal in configuration
**Problem:** `high_value_amount_cap` and `paypal_dispute_fee` in `config.py` are `float`, while the rest of the system moved to `Decimal` in P1-6.
**Files:** `backend/app/core/config.py`, `control_tower_service.py`, `routers/control_tower.py`.
**Steps:** parse with `Decimal(os.getenv(...))`, update comparisons, and add a test at the cap boundary (`500.00` allowed for OPERATOR, `500.01` blocked).
**Depends on:** Task 4.

## Task 15: Settings should read the environment at call time
**Problem:** `Settings` evaluates `os.getenv` at class-definition time and `get_settings()` is `lru_cache`d, so settings cannot be changed after import. This is part of why the tests are order-dependent.
**Files:** `backend/app/core/config.py` and its callers.
**Steps:** migrate to `pydantic-settings` (instance-level, validated, typed). Add validators for `APP_ENV`, `PAYPAL_MODE` and URL fields. Provide a `get_settings.cache_clear()` hook for tests.
**Depends on:** Task 4.

## Task 16: Close the firewall holdout gaps without contaminating the benchmark
**Problem:** The held-out corpus reports 27 of 30 attacks blocked (90%). The documented misses are split-word evasion and untuned Russian phrasing.
**Files:** `backend/app/services/firewall.py`, `backend/app/data/eval_corpus.py`, `backend/tests/data/holdout_corpus.py`.
**Steps:**
1. Add a third blind set (new attacks written without looking at firewall rules) and keep the existing holdout frozen.
2. Add split-word handling (inter-character punctuation and spacing collapse) and Russian and other-language patterns, tuning only against `eval_corpus.py`.
3. Report block rate and false-positive rate for all three sets in `/api/arena/eval`.
**Acceptance:** false-positive rate on the benign set stays at zero. The frozen holdout is untouched (checksum test).
**Depends on:** Task 4.

---

## PRIORITY 3: Frontend and hygiene

## Task 17: Frontend quality
**Problem:** 78 ESLint warnings and no frontend tests. Only route-level `200` smoke checks exist.
**Files:** `frontend/src/**`, `frontend/package.json`, `frontend/eslint.config.mjs`.
**Steps:** fix the warnings (or justify and suppress each), add Vitest for `lib/api.ts` and the proxy route, add a Playwright smoke test that logs in (Task 1), opens the approval queue, and exercises approve and reject against a backend in simulated mode. Make lint fail CI on warnings once clean.
**Depends on:** Tasks 1 and 3.

## Task 18: Approval queue completeness
**Steps:** show SLA and overdue state (Task 7), show the audit-chain verification result inline, add an edit-letter diff view, add pagination and filters to the queue, and add optimistic-conflict UX for 409 CAS errors (reload and show who changed it).
**Depends on:** Tasks 7 and 17.

## Task 19: Documentation truth pass
**Problem:** `README.md`, `FINAL_REPORT.md`, `DEVPOST_SUBMISSION.md`, `.gsd/STATE.md` and `progress.txt` contain claims that are now stale or inaccurate (107 passing, "Fetch real sandbox transactions", OpenAI support, `file:///c:/paypal/...` badge link, Python version).
**Steps:** after Tasks 4, 5, 9 and 12, update the Real vs Simulated matrix, test counts, and badge links. Remove the Windows `file:///` link. Add a short `SECURITY.md` describing the auth model, key handling, and known limitations.
**Depends on:** Tasks 4, 5, 9 and 12.

## Task 20: Repository hygiene
**Steps:**
1. Add `.gitattributes` (`* text=auto eol=lf`) and normalise line endings in one dedicated commit. `git status` currently shows widespread modifications that are likely CRLF-only.
2. Move agent tooling (`.agent/`, `.agents/`, `.gsd/`, `.gemini/`, `adapters/`, GSD docs) out of the product root or into a clearly documented `tooling/` directory. The design, brand and banner skills are unrelated to the product.
3. Pin all backend dependencies, including test dependencies, in `requirements-dev.txt`. Today `pytest` is not in `requirements.txt`, and CI installs it ad hoc.
4. Add `dependabot.yml` and a CI job for `pip-audit` and `npm audit`.
**Depends on:** do last.

---

## Suggested execution order

`4 → 1 → 2 → 3 → 14 → 15 → 5 → 6 → 7 → 8 → 9 → 10 → 12 → 11 → 13 → 16 → 17 → 18 → 19 → 20`

Tasks 1 to 3 are the real blockers before any public deployment. Tasks 5 and 6 are what make the "live" claims true.