# 1SHOTCAM.COM — OneShot Ecosystem

An Arabic, right-to-left workspace combining the OneShot store, payment gateway workspace, encrypted administrator vault, AI executive office, and Gemini/Ollama assistant. It uses the original OneShot aperture emblem and the requested charcoal/orange visual identity.

## Technology and local development

- React 19, TypeScript and Vite for the responsive client.
- Netlify Functions for JSON APIs and server-side authorization.
- Netlify Database (managed PostgreSQL) through `@netlify/database` and Drizzle's Netlify adapter.
- Netlify Identity for account creation, invitations, recovery and administrator roles.
- Google GenAI SDK through Netlify AI Gateway; HTTPS integration with the existing OneShot core for payments, executive requests and Ollama.
- Netlify Image CDN for the product concept images.

Install with `pnpm install`. Link the project with Netlify CLI, then run `netlify dev --port 8889` for local development with Functions and Identity. Plain `pnpm dev` serves the client only. `npm run build` is the deployment build command; Netlify publishes `dist`. Local build, test, dev-server and type-check commands were not run during this implementation; the deployment pipeline performs validation.

The template service was unavailable, so the application was assembled directly with React and Vite. No template demo content remains.

## Persistent data

`db/schema.ts` defines products, orders, encrypted gateway credentials, conversations, messages, staff, audit events, webhook receipts and rate-limit counters. Migrations in `netlify/database/migrations` are applied automatically by Netlify during deployment. Never apply migrations manually. After a schema change, generate a migration using `npm run db:generate -- --name describe_change`.

The catalog migration inserts the four products and exact USD prices specified for this project. It is business configuration, not a simulated API. No orders, payment successes, staff, conversations or revenue are fabricated. Revenue counts only live orders confirmed by a signed callback, grouped by currency. The UI shows actual loading, empty, authorization and service-error states.

Application records are stored in **Netlify Database**, not in the VPS PostgreSQL instance. The application does not claim to verify or administer the VPS database. The VPS remains an external payment/AI processing integration. Supplied database credentials were not copied into source files, build settings or the browser.

## External setup

The owner has elected to configure these requirements in the administration panels. Their readiness must be checked, not assumed.

1. Install a publicly trusted TLS certificate on `api.1shotcam.com`. The current integration always verifies TLS and never sends payment data or merchant credentials over the supplied HTTP IP endpoints.
2. Configure `VAULT_ENCRYPTION_KEY` in the project's Functions runtime scope as a securely generated 32-byte key encoded with 64 hexadecimal characters. Configure it separately in each deployment environment. Do not rotate it without migrating encrypted rows: existing credentials depend on the original key.
3. Configure `ONESHOT_WEBHOOK_SECRET` in both the core's signing adapter and the project's Functions runtime. Use a high-entropy value at least 32 characters long. The application must not display it. `ONESHOT_API_TOKEN` is optional if the core requires a service token.
4. Identity is enabled. Invite the first administrator from Identity, accept the invitation, then assign the `admin` role in the user's Identity settings. Ordinary signups do not receive that role.
5. Add each provider's real or sandbox merchant credentials through the authenticated vault. They are encrypted with AES-256-GCM and provider/environment associated data. Only metadata is returned by the vault list endpoint.
6. Confirm that the core implements the request and signed callback contract below. A live merchant account, appropriate provider capabilities, allowed redirect domains and 3DS settings are external prerequisites.

The admin vault includes a live readiness display for database access, core HTTPS, encryption configuration, callback configuration, the authenticated admin role and the existence of a live paid order with a verified callback. It does not treat an HTTP 200 response alone as a verified payment integration.

## Payment flow and compatibility contract

`POST /api/gateways/execute-live` requires an authenticated account and an `Idempotency-Key`. Arbitrary gateway workspace transactions require the administrator role; store checkout uses a database product ID and server-authoritative price. The client cannot override product prices. Store checkout currently uses Telr live hosted checkout; configure its live merchant credentials before enabling purchases.

The function persists the order before contacting the core at `https://api.1shotcam.com`. It sends `orderId`, `merchantOrderId`, `productId`, `gatewayCode`, `executionMode`, `topologyMode`, `amount`, `currency`, `country`, `description`, `cardholder`, `deviceEnvironment`, `loaderSecurityOverrides`, optional `paymentToken`, `credentials`, `callbackUrl` and `idempotencyKey`. The `credentials` object is decrypted only in the function and transmitted only to that fixed, trusted HTTPS hostname. **Compatibility with the existing VPS implementation is not yet verified.** Do not interpret a persisted credential as evidence that the provider accepted it.

The primary payment endpoint is followed by `/api/loader/execute` and `/api/payment/execute` only if the core returns a structured JSON route-not-found error. Never retry financial mutations after a timeout, HTML response or ambiguous upstream failure. Those orders remain `unconfirmed` for reconciliation. Reusing the same key returns the original local order and does not send another payment request. It also rejects reuse against a different owner or different financial details.

Hosted checkout, iframe and payment link modes use real provider URLs. Direct API, tokenization and mobile bridge modes require a token already issued by the provider's official SDK. This app is not a native mobile SDK and does not generate tokens, spoof fingerprints, or handle PAN/CVV. Device choices are test metadata. Production requests force all protections on; sandbox toggles are requests to the core, not proof that the provider implements those controls. The six-mode option reports connection diagnostics and individually unexecuted modes; it never creates six charges.

Checkout extraction supports `redirectUrl`, `gatewayRawResponse.order.url` and `gatewayRawResponse.redirect_url`. Only HTTPS URLs on approved payment-provider domains are accepted. The embedded checkout includes an external-window option for providers that disallow framing. An iframe load, client message, redirect or upstream response cannot mark an order paid.

### Signed callback protocol

The callback is `POST https://1shotcam.com/api/webhooks/callback`. Before domain transfer, configure the core to also deliver callbacks for this deployment to the target Netlify site's same API path, because the production hostname still serves the existing site. Use the server-side `ONESHOT_CALLBACK_URL` override described below for checkout requests during staging.

The core must first verify the provider's **native webhook signature**, then normalize and sign the event sent to this application. This endpoint does not implement the native webhook formats of all seven providers.

Required JSON fields are `eventId`, `orderId`, `gatewayCode`, `executionMode` (`PRODUCTION` or `SANDBOX`), integer `amountCents`, `currency` and `status` (`paid` or `failed`). It must send these headers:

- `x-oneshot-timestamp`: current Unix time in seconds.
- `x-oneshot-signature`: lowercase hex HMAC-SHA256 of `timestamp + '.' + raw_request_body`, keyed by the configured webhook signing secret.

The handler enforces a five-minute timestamp window, constant-time signature comparison, amount/currency/gateway/environment matching, and transactional event deduplication. A paid order cannot be downgraded by a late failure or checkout response. Keep a reconciliation procedure with the gateway for `unconfirmed` orders; automatic refunds, fulfillment and subscription provisioning are outside this unverified core contract.

Set `ONESHOT_CALLBACK_URL` to an HTTPS callback on `1shotcam-ecosystem.netlify.app` or one of its Netlify deploy subdomains when validating before migration. The default remains `https://1shotcam.com/api/webhooks/callback`. Unapproved hostnames are rejected. Remove the override after domain transfer.

## AI and team workspace

Authenticated users can select Gemini, OneShot core or Ollama, choose assistant personas, save/reopen/delete owned conversations and use browser Arabic dictation when supported. Gemini supports search grounding and Maps grounding with the compatible Gemini 2.5 Flash model. Sources are included in returned answers. Dictation uses the browser's speech service and is saved as part of the conversation only when sent successfully. Provider-specific chat controls are disabled for core/Ollama when unsupported.

Gemini uses Netlify AI Gateway with the official SDK default constructor. The platform injects provider configuration; no Gemini credentials are bundled in the client. Gateway availability requires a production deployment. Core and Ollama requests go through the fixed HTTPS API, not the public Ollama HTTP port.

Administrators can create/activate/deactivate named staff specializations. AI CEO requests receive actual database order totals and staff context. Reports are advisory and cannot execute financial or administrative mutations. AI model output is rendered as text, not executable HTML.

## Routing and cache behavior

Both `_redirects` copies and `netlify.toml` place `/api/*` before the SPA fallback. The forced rewrite targets the server Function so auth, encryption, idempotency and persistent order tracking cannot be bypassed by a generic HTTP proxy. Redirect targets are plain URLs, not Markdown links. `public/_redirects` is copied into the Vite publish directory.

`callBackendApi(endpoints, payload)` reads response text before parsing JSON. An HTML response produces a useful error; read-only health can check the independent HTTPS origin. Financial, vault and AI requests never fall through to an unverified browser-origin API that bypasses local authorization and persistence. Safe alias fallback is supported by the server and local router.

The early head script unregisters old service workers and clears Cache Storage. `Clear-Site-Data` clears cache only; clearing storage on every response would invalidate Identity sessions. Runtime responses are `no-store`. The root HTML contains finished Arabic site name, description and sharing metadata, without an `og:image` override.

Hostname defaults are: root/www → store, portal/pay → gateway, admin → vault, ai/app → studio. `?module=store|gateway|vault|ceo|ai` allows direct navigation; browser back/forward works. API authorization remains server-side regardless of which hostname or tab is open.

## Deployment and the approved domain transition

The owner approved moving domains **only after a successful deployment and verification**. Existing sites must keep their domains until those conditions are met. No domain or DNS changes were made during this implementation. At the latest remote check, the target site's health path returned 404 and the external API certificate was still self-signed. These observations are point-in-time findings, not permanent configuration.

Follow [the deployment runbook](docs/deployment.md) after the platform publishes this project. Do not transfer domains solely because the static homepage renders. Preserve existing assignments and DNS records for rollback, and leave `api.1shotcam.com` pointing to the VPS.

## Images and reference

The brand emblem comes from the supplied [OneShot repository](https://github.com/finance538/oneshot-ai-google-). Camera and studio-kit images are illustrative product concepts generated through Netlify AI Gateway, saved in `public/img/camera.png` and `public/img/studio-kit.png`. The exact prompts and generation method are retained in `scripts/generate-assets.mjs`. They are displayed through the Image CDN and described as concept images in product details.
