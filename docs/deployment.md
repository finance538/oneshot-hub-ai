# Deployment and domain transition

The approved order is deployment → verification → domain transfer. External setup is being prepared by the owner. No repeat approval is required for the same conditional transfer, but readiness evidence is required.

## Before transferring traffic

1. Publish this project through the normal Netlify pipeline. Confirm the deployment reached Ready and database migrations completed. Keep the existing domain assignments intact.
2. On the target `1shotcam-ecosystem.netlify.app` deployment, verify the Arabic homepage, all five modules, mobile navigation and browser history. Confirm static assets and Image CDN images return successfully.
3. Confirm `/api/health` returns JSON. It must reflect successful Netlify Database access and a trusted HTTPS connection to `api.1shotcam.com`; an HTML page or merely successful static deployment is insufficient. VPS database health is a separate verification.
4. Confirm `/api/products` returns the four persisted catalog products with their specified prices. Confirm anonymous calls to admin vault, staff and executive endpoints return 401, and ordinary signed-in users receive 403. Invite/assign the initial admin through Identity. Verify signup, recovery and invitation links against the intended site URL.
5. Set the vault encryption and signed-callback configuration in the correct runtime scopes. Review the vault readiness display from an admin session. Save a sandbox merchant configuration and verify it can create a real sandbox checkout through the core. Confirm core request/response compatibility first.
6. Set the staging callback override to this target's HTTPS callback URL. Complete the provider's sandbox challenge and verify the normalized signed webhook updates exactly the matching order. Confirm duplicate events are acknowledged once, altered signatures/amounts are rejected, and repeated idempotency keys cannot create a second payment.
7. Complete an owner-controlled $1 live verification purchase through the configured live merchant account. Confirm the order remains awaiting/unconfirmed until a valid callback, then becomes paid. Check the merchant dashboard and transaction reference. The live-readiness indicator requires a paid live order with a stored authenticated receipt.
8. Verify Gemini and core/Ollama conversation round trips, owned history, staff create/update and actual executive reports. Do not count empty success responses as completion. Core-specific features require actual support on that server.

## Transfer and verification

Record the current domain assignments, aliases, DNS records, TLS state and Identity redirect configuration privately before changing them. Existing assignments were found for the root, admin, portal and ai hostnames; re-read the live configuration because it can change. Check www, pay and app individually rather than assuming their ownership.

Move only these approved application hostnames to this project: `1shotcam.com`, `www.1shotcam.com`, `portal.1shotcam.com`, `pay.1shotcam.com`, `admin.1shotcam.com`, `ai.1shotcam.com`, `app.1shotcam.com`. Use the root as the primary domain. Release conflicting assignments from their current projects only as part of the verified cutover. Do not delete the old projects.

Keep `api.1shotcam.com` at the VPS address `187.7.65.45`. Do not edit unrelated DNS records. Provision and verify trusted HTTPS for every moved hostname. Confirm subdomains remain available as aliases without redirects that discard hostname-specific routing.

Remove the staging callback override, update the core and provider allowlists to the production callback, and verify `https://1shotcam.com/api/webhooks/callback` reaches this app. Check `portal`/`pay` open the payment module, `admin` opens the vault, and `ai`/`app` open the studio. Verify browser auth/callback URLs for each hostname; sessions are intentionally not forced to share credentials across subdomains.

Recheck the complete payment/AI/auth flows on the final domains, avoiding duplicate financial operations. Observe error rates and signed callback delivery after cutover.

## Rollback

If TLS, authentication, API routing or payment callbacks fail after the move, restore the recorded domain assignments and DNS, then restore the prior callback target. Keep this project's database and deployment for diagnosis; do not delete new orders or payment receipts. Reconcile every unconfirmed payment with the provider before retrying. A later retry of the transfer still follows the same verification gates.

## Recorded implementation-time findings

The target project did not yet have a published deployment, and its `/api/health` returned 404. The external API certificate failed trust verification as self-signed. Identity activation completed. No domains or DNS records were changed; no live payment or production deployment was claimed. Re-evaluate these observations after the owner completes setup and the platform publishes the application.
