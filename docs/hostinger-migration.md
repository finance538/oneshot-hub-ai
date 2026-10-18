# Hostinger → Netlify migration status

This is an application migration, not an image or Docker-container migration. Source changes are prepared for the platform's deployment pipeline. No VPS data export was supplied, no records were imported, no DNS was changed, and the VPS was not stopped.

## Supplied material

The owner supplied `package.zip`, `src.zip` and `schema.zip`. The source consists of `src/server.js`, `src/services/gatewayEngine.js` and `src/services/aiWorkforceEngine.js`. The SQL defines eight tables and contains no INSERT statements. It is an initialization schema, not proof of the current live schema or a backup.

Archive SHA-256 fingerprints:

| Archive | SHA-256 |
| --- | --- |
| src.zip | d6fb6fac952db83288bd240f41cf0d5a70745724e87f7389ea4ccdda15991395 |
| package.zip | cf9bc1fc4bc9c99affa7e11089a435404cb9e711b642eddddabe6652a0fde777 |
| schema.zip | aa4dd342b5c51cdb764f2ab98787643edd76d6dc06a46f8bd6864038c936c525 |

The uploaded code used process-global maps/sets for credentials, employee selection and policies, exposed administrative mutations without authentication, accepted raw card fields, and could issue one payment request for each selected diagnostic channel. AI failure could return a canned answer. Those behaviors were not copied into the Netlify runtime.

## Implemented application changes

The existing Netlify Function now handles the V6 compatibility endpoints. Credential and loader-policy routes require an Identity administrator. Secrets use the existing AES-GCM vault with gateway/environment associated data. Only credential metadata is returned. Arbitrary gateway URLs and generic provider registration are rejected. A new policy table persists the supported loader settings; its security-toggle values describe requirements, not attestations of device/AVS/VPN checks. The current adapter's actual controls are described in the payment UI.

| V6 endpoint | Netlify behavior |
| --- | --- |
| GET /api/health | Real Netlify database check; no outbound VPS health request |
| GET/POST /api/gateways/:gatewayCode/credentials | Administrator-only encrypted vault, explicit sandbox/live environment |
| GET/POST /api/admin/loader-policy | Administrator-only durable policy; standard SANDBOX/PRODUCTION modes (legacy live_production is mapped explicitly) |
| POST /api/gateways/register | Explicit adapter-required error; never register arbitrary payment destinations |
| POST /api/tester/run-global-check | Translates legacy channel names into the same authenticated payment handler; requires operation key; all-mode diagnostics never charge |
| GET /api/ai-workforce/catalog | Public catalog without system prompts; selections only for the current account |
| POST /api/ai-workforce/hire | Durable organization-owned employee selection; no automatic billing or subscription |
| POST /api/ai-workforce/chat | Owned persisted Gemini conversation; UUID requestKey or Idempotency-Key required; no tools exposed through the legacy chat |

Legacy employee codes map to the existing workforce catalog. The sales advisor has a new catalog-only seed. Accounts receive their own organization; an account's selections and chats do not become global state. Gemini requests use the existing official SDK/model through AI Gateway. Invalid providers fail explicitly, and provider failures remain failures. Chat history is available through the existing owned workforce chat endpoint. The undefined collaboration variable in that conversation handler was corrected using actual stored task contributions, rather than fabricated specialist responses.

New payment requests use a direct Stripe Checkout adapter with a fixed HTTPS origin and pinned API version. They support hosted checkout and individual hosted links. These are Checkout Sessions, not reusable Payment Link resources. New orders use processor `netlify`; all existing orders retain `legacy_core`. The normalized HMAC callback continues to serve only old orders. New confirmations use an authenticated Stripe session query matching ID, order reference/metadata, amount, currency and live/test environment. A transactional receipt records the verified result. No redirect, iframe message or session-create response confirms a payment.

The upload included provider-specific creation branches for PayTabs, Telr and Stripe, but did not include a complete authenticated confirmation/reconciliation system. This change enables only the implemented Stripe protocol. PayTabs, Telr, Moyasar, HyperPay, Tap and Checkout.com remain unavailable for new payments until their official creation, environment and confirmation contracts are implemented and verified. Their vault records and historical orders are not deleted. The generic upstream adapter was removed; unsupported providers fail before any order or network payment mutation.

If creation times out before a session ID is saved, the order and idempotency key are retained. Repeating the same key returns the old local order and does not resend the charge. Such an order requires manual provider-side reconciliation; the automatic reconciler cannot infer a missing session. Pending known sessions are checked on owner request and by a production schedule every five minutes (three orders per invocation). This capacity must be reviewed before high-volume operation. Refunds, fulfillment and recurring subscriptions are not introduced.

## Source database mapping and outstanding records

No live data is present in the provided archives. Do not apply the old initialization SQL on top of the Netlify database or replace the existing tables. Future imports require an owner-controlled export, source schema/count checks and a reviewed identity/ownership mapping. Compare record counts, relationships and financial totals after import before cutover.

| Source table | Destination / reconciliation requirement |
| --- | --- |
| users | Identity account mapping plus organization ownership; do not import password hashes into application tables or promote source roles automatically |
| ai_employees | workforce_employees; seven legacy roles mapped; catalog definitions are not billing or execution records |
| merchant_ai_subscriptions | Preserve historical billing separately; employee selections do not prove an active paid subscription |
| payment_gateways | vault_keys; re-enter verified credentials through the encrypted admin vault; no plaintext JSON credential import |
| tester_gateway_policies | core_policies for the supported admin policy; per-tester assignments require an explicit access mapping |
| payment_documents | orders plus verified provider references/receipts after identity mapping; never import success blindly |
| qa_tester_runs | Historical diagnostics require a separate reviewed import; they are not confirmed payments |
| ai_workspace_sessions | Owned workforce chat turns after employee/identity mapping; preserve source timestamps and provenance in a reviewed importer |

Do not upload raw database dumps, private keys, plaintext credentials, raw PAN/CVV, or unfiltered payment payloads into this repository. Source records containing raw request/response JSON need owner-side filtering before any import. No importer has been run or implemented for those absent records.

## Remaining Hostinger services

The screenshots identified the following dependencies; their runtime data and full source were not supplied:

| Service | Remaining work before VPS retirement |
| --- | --- |
| /opt/oneshot-master-v6/frontend and nginx | Compare any VPS-only pages/assets with the current Netlify storefront; the frontend folder was not uploaded |
| PostgreSQL Docker volume | Obtain safe export/schema/count inventory and perform reviewed mapping/import; initialization SQL is insufficient |
| Hermes gateway and oneshot-agent-gateway | Inspect source, scheduled/background work, tool permissions and state; adapt individual jobs to bounded Functions where feasible |
| /root/oneshot-mail-form | Inspect application/source and actual mail/account connection state; existing Netlify mail features do not establish migration of this service |
| Open WebUI | Export owned conversations/uploads; map accounts and files; Docker daemon deployment is not supported on Netlify |
| Ollama (system service and Docker) | Local model serving is not hosted on Netlify Functions; existing site AI uses AI Gateway, but other callers/state remain to be inventoried |
| code-server | Preserve workspaces; a persistent remote development server needs a separate destination or retirement decision |
| Traefik, cron and other OS services | Inventory routing/jobs and replace necessary application behavior; do not copy OS daemons or certificates into the application |

Files/uploads, if supplied later, belong in Netlify Blobs with authenticated ownership enforcement. Structured records belong in Netlify Database. No empty placeholder import is counted as completed migration. Keep the Hostinger services, volumes and current DNS until all required replacements, records and outstanding payments are verified.

## Release verification

The platform must apply the generated migration and catalog seed, validate the application, and publish it. Local build/test/typecheck/dev-server commands were not run under repository policy. Identity activation was run. The read-only migration inventory showed 12 applied migrations before this change; none were edited. The final inventory showed those same 12 applied migrations and exactly two new pending migrations, with no missing or out-of-order entries. Stripe request fields and version were inspected in its official public OpenAPI specification, but no real provider call or payment was executed.

On the deployed preview, use two Identity accounts and an administrator to verify unauthorized/admin denials, isolated selections/history, rate limits, missing/invalid request keys, duplicate message/checkout keys and failure states. Check every route through both /api rewrites and the Function route query. Verify the quote-only public catalog remains quote-only. Check three-mode capability limits (two creation modes plus non-charging diagnostics), sandbox/live key separation, malformed/HTML/time-out responses, missing session IDs, and matching/mismatching amount/currency/environment/order references. Verify that legacy signed callbacks reject native orders and cannot downgrade a paid order. Use controlled Stripe test credentials first; only the owner-approved live merchant verification can establish live readiness.

Verify the five-minute reconciliation schedule on production, refresh/new-tab return behavior, and account switching. No source editing result establishes successful deployment, credentials, merchant readiness, legacy-record import or domain transfer. Full VPS retirement remains blocked by the absent records and remaining service sources above, not by a request for repeated permission.
