# Current shared-session integration

Google login now starts at `/api/auth/google/start?return_to=<encoded complete application URL>` on `https://www.1shotcam.com`. The server validates the origin against the fixed ecosystem list and `ONESHOT_SSO_CLIENTS`, runs Google consent, and returns to that URL. Do not rewrite the original page to the Hub. Browser-bound state, PKCE, ID-token validation and an atomic database consume protect the callback. The shared cookie is HttpOnly and must never be copied into JavaScript storage or a URL.

Receivers use `fetch("https://www.1shotcam.com/api/session", { credentials: "include" })` to read the server-verified account; private API calls also include credentials. Logout posts to `/api/auth/logout` with credentials. A custom request must originate from an approved app origin. Render roles from the server response and remount private state when the account changes. The current repository includes the updated receiver/client and app switcher; independent projects need that integration deployed separately. Their domain assignments are unchanged.

The legacy PKCE bearer-grant endpoints remain for previously integrated clients. The notes below describe that older protocol; the new shared-cookie login does not require a Hub-page handoff.

# OneShot Hub integration and release

## Scope

The Hub at `https://www.1shotcam.com` supplies the public flagship experience, account entry point, shared API and Lite employee workspace. `/hub` opens the lightweight portal. `/workforce` retains the existing headquarters as an explicitly launched route, with a dedicated-app banner pointing to `https://workflow.1shotcam.com`. The Hub module graph contains no office rendering imports. Existing products, legal pages, owned orders and authenticated gateway modules remain available.

The ecosystem registry now points OneShot Brand at `https://brand.1shotcam.com`, matching the other applications' `1shotcam.com` domain (changed on 2026-10-19 at the owner's request from the earlier `brand.oneshotcam.com` spelling). The same origin is in the server allow-list. Links do not alter domain assignments or DNS; the Brand project itself must answer on that hostname.

## Enable shared sign-in on standalone applications

The bridge is implemented here, but external projects must adopt its receiver and backend integration. Merely linking to a domain or sharing an Identity project does not establish a browser session across origins.

1. Deploy the Hub and let the platform apply `20261019030302_add_ecosystem_sso_grants`. Retain every applied migration. Do not run migration SQL manually.
2. Keep the existing `VAULT_ENCRYPTION_KEY` configured only on the central backend. Grant storage uses AES-256-GCM with per-grant and per-audience authenticated context. A key change invalidates encrypted grants as well as existing vault data.
3. In each dedicated project, integrate the behavior of `src/hub/SsoReceiver.tsx` at `/sso/start` and `/sso/callback`, and the `src/lib/ecosystem-session.ts` adapter. The shared `src/lib/api.ts` routes registered app API requests to the central Hub with the short-lived opaque session. Private UI must hydrate its identity through `/api/ecosystem/me`, clear on expiration/revocation/account changes and never trust editable browser profile fields for authorization. Preserve the standalone application's own root UI; the bridge is not a replacement for its engine.
4. Expose a JSON `GET /api/ecosystem/handshake` response with `protocol: "oneshot-pkce-v1"`, the exact registered `appId`, `issuer: "https://www.1shotcam.com"`, and `sso: true` only once that project's receiver and API adapter are installed. This repository's handler uses `ONESHOT_APP_ID` and inclusion of that ID in `ONESHOT_SSO_CLIENTS` for this declaration. Standalone receivers do not need the Hub encryption key or a copy of its database.
5. On the Hub, set the comma-separated `ONESHOT_SSO_CLIENTS` allowlist to the reviewed receiver IDs: `workflow`, `ai`, `pay`, `brand`, `loader`, as each is verified. The default is empty. The launcher offers SSO only when the fixed destination's HTTPS JSON handshake matches, the Hub allows that app, the central vault is configured and the Hub is on its production origin. Ordinary web links remain available with an unverified connection label.
6. Verify each handoff with an owned account, including code expiry, replay, wrong state, wrong PKCE verifier, unexpected origin, role restrictions and logout. Preview identities cannot mint production grants. Do not enable a receiver before the deployment and authenticated checks pass.

The receiver generates its own verifier and state and saves that temporary navigation state in session storage. The Hub displays the fixed destination and current account, then issues a one-time code. The code travels in the URL fragment, is removed immediately on arrival and is atomically redeemed with the verifier. Codes expire after 60 seconds. The resulting opaque session is valid for at most ten minutes and is stored in that application's session storage, not in a URL. Only hashes of codes and opaque sessions are stored in the database. The central backend decrypts and checks the underlying Identity credential; roles come from Identity application metadata. The existing Identity token lookup cache has a maximum 45-second duration.

Every opaque-session request checks the grant's expiry and exact origin in the database. Hub logout revokes bridge sessions before clearing its Identity session. Dedicated-app logout revokes bridge sessions and clears that application's local session; the central Identity cookie can only be cleared on the Hub origin. Failed revocation is reported, and local sign-out still proceeds. The receiver polls account validity while visible and clears private state on expiration or invalidation. Account reauthorization returns through the Hub, without sharing refresh tokens or merchant credentials. No shared parent-domain cookie is needed, including for the separately spelled Brand domain.

## Your space (ONESHOTHUB page)

`/hub` is the page a sign-in opens. It renders the `YourSpace` showcase before the command room: the ecosystem idea in plain words, three start steps, a six-service selector with keyboard tab navigation, the per-service benefit copy already maintained in eight languages, the live connection label from `/api/ecosystem/status`, and related catalog products fetched from `/api/products`. The mapping from service to catalog categories (`hub` → MKT/DIG, `workflow` → SOC, `ai` → AI, `pay` → AUT, `brand` → BRD/MED, `loader` → WEB) lives in the component as configuration. Product names, descriptions, SAR prices, delivery windows and images come from the database rows; catalog services keep their quote-only labelling and link to the existing detail pages. The homepage command section shows the same box so visitors see the full offer before signing in. The Hub no longer renders the Lite portal inline on the homepage; `openPortal` navigates to `/hub#command` after a successful sign-in (or immediately for signed-in accounts), and on `/hub` it scrolls to the command room.

## Lite workspace and attachments

The portal reuses `/api/workforce/catalog`, `/workspace`, `/organization`, `/chat`, `/tasks` and the existing owned mailbox endpoints. Catalog and workspace errors remain distinct from an empty result. Task state, owned-order summaries and mail drafts come from the database. Order review and checkout-return links load the existing authenticated order flow, preserving reconciliation rather than treating navigation as payment confirmation. Task dispatch retains its request key through an uncertain result; conversation requests retain their existing idempotency handling. Generic task approval is not represented as external execution.

Email approval displays the actual recipient, subject and full body and submits those exact values to the existing transactional sender. Transport errors never cause automatic sending retries. Existing unknown-outcome reconciliation remains available in the full operations workspace. Public requests do not send mail.

The attachment endpoint accepts one PDF, JPEG, PNG, WebP or plain-text file of at most 1 MB. Gemini 2.5 Flash through Netlify AI Gateway extracts context for review; the original binary is transient and is not stored. The user explicitly sends the reviewed composer text to persist it in the existing conversation or task. Uploaded content is treated as untrusted source data, with no execution tools. Voice reuses the existing browser/Gateway transcription and browser/Azure synthesis routes; permission refusal and unavailable providers remain visible.

## Installation and native releases

The PWA manifest has real 192px/512px icons, standalone display and `/hub` as the launch URL. The install button uses the browser's actual installation event where available, otherwise gives browser-menu instructions. The service worker caches only the public offline document; it does not cache signed-in HTML, APIs, Identity, callbacks or account records. Previous unconditional service-worker unregistering and cache-clearing were removed so installation can survive navigation. Existing no-store headers remain.

`ONESHOT_ANDROID_APK_URL` may identify a published HTTPS `.apk` on one of the exact registered ecosystem origins. The status endpoint requires a successful HEAD response and an APK/octet-stream content type before exposing the download link. It follows no redirects and never disables TLS validation. Supply a signed, independently verified artifact before configuring this URL. This change does not build or distribute an APK, implement native push, promise faster performance or supply a native deep-link scheme.

## Verification recorded during implementation

Source and generated SQL were inspected and formatted. Identity activation completed. No build, test, typecheck, development server or manual migration commands were run, in accordance with project deployment rules. Responsive styles include mobile header compression, single-column layouts, wrapped actions, an internally scrollable comparison table, native dialogs and reduced-motion behavior; actual viewport and keyboard checks remain pending on the deployed site.

Read-only HTTPS requests to the prospective handshake endpoint on 2026-10-19 returned:

| Destination | Observed result before this deployment       |
| ----------- | -------------------------------------------- |
| Hub         | 404                                          |
| AI          | 200, HTML rather than the handshake contract |
| Pay         | 200, HTML rather than the handshake contract |
| Brand       | DNS resolution failure                       |
| Workflow    | 406                                          |
| Loader      | 401                                          |

These are endpoint observations, not proof of the underlying applications' operating state. No cross-app sign-in, live inference, email delivery, payment, native installation, successful new deployment or domain transfer was verified. Existing TLS, credentials, role setup and integration dependencies remain. Preserve current domain assignments and DNS until deployment and the authorized release checks succeed; keep the API hostname on its existing VPS assignment.

After platform validation, verify the public pages at narrow mobile and desktop widths in all eight languages, tab/keyboard navigation, account recovery/confirmation, organization creation, saved chat after reload, account switching, microphone denial/interruption, attachment review, task dispatch/recovery, exact-content mail approval, PWA installation/offline behavior and each configured SSO receiver. Verify gateway and order-return routes separately to preserve the existing financial safety controls.
