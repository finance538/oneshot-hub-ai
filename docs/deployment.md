# Deployment and domain transition

The approved order is deployment → verification → domain transfer. External setup is being prepared by the owner. No repeat approval is required for the same conditional transfer, but readiness evidence is required.

## Before transferring traffic

1. Publish this project through the normal Netlify pipeline. Confirm the deployment reached Ready and database migrations completed. Keep the existing domain assignments intact.
2. On the target `1shotcam-ecosystem.netlify.app` deployment, verify the Arabic homepage, all five modules, mobile navigation and browser history. Confirm static assets and Image CDN images return successfully.
3. Confirm `/api/health` returns JSON. It must reflect successful Netlify Database access and a trusted HTTPS connection to `api.1shotcam.com`; an HTML page or merely successful static deployment is insufficient. VPS database health is a separate verification.
4. Confirm the new schema and catalog migrations apply in order and `/api/products` returns 53 active source records: 48 services, four media packages and one ads package with original SAR prices. Confirm filtering, Arabic/English copy, images, detail routes, quote-only requests and seven company/legal pages. Confirm direct payment requests for imported service IDs are rejected as `SERVICE_QUOTE_REQUIRED`. Confirm anonymous calls to admin vault, staff and executive endpoints return 401, and ordinary signed-in users receive 403. Invite/assign the initial admin through Identity. Verify signup, recovery and invitation links against the intended site URL.
5. Set the vault encryption and signed-callback configuration in the correct runtime scopes. Review the vault readiness display from an admin session. Save a sandbox merchant configuration and verify it can create a real sandbox checkout through the core. Confirm core request/response compatibility first.
6. Set the staging callback override to this target's HTTPS callback URL. Complete the provider's sandbox challenge and verify the normalized signed webhook updates exactly the matching order. Confirm duplicate events are acknowledged once, altered signatures/amounts are rejected, and repeated idempotency keys cannot create a second payment.
7. Complete an owner-controlled $1 live verification through the administrator gateway workspace and configured live merchant account (the public services catalog requests quotes). Confirm the order remains awaiting/unconfirmed until a valid callback, then becomes paid. Check the merchant dashboard and transaction reference. The live-readiness indicator requires a paid live order with a stored authenticated receipt.
8. Verify Gemini conversation round trips through Netlify AI Gateway for both the studio and executive workspace, owned history, staff create/update and actual executive reports. Verify the executive aliases still require the administrator role and chat aliases do not cross into executive requests. Existing conversations must remain accessible to their owners. Stale requests selecting Core or Ollama must return `AI_PROVIDER_MIGRATED` without inference or new conversation creation. AI requests must complete independently of VPS health; payment verification still requires the external core. Do not count an available database or empty success response as confirmed AI inference.

## Transfer and verification

Record the current domain assignments, aliases, DNS records, TLS state and Identity redirect configuration privately before changing them. Existing assignments were found for the root, admin, portal and ai hostnames; re-read the live configuration because it can change. Check www, pay and app individually rather than assuming their ownership.

Move only these approved application hostnames to this project: `1shotcam.com`, `www.1shotcam.com`, `portal.1shotcam.com`, `pay.1shotcam.com`, `admin.1shotcam.com`, `ai.1shotcam.com`, `app.1shotcam.com`. Use the root as the primary domain. Release conflicting assignments from their current projects only as part of the verified cutover. Do not delete the old projects.

Keep `api.1shotcam.com` at the VPS address `187.7.65.45`. Do not edit unrelated DNS records. Provision and verify trusted HTTPS for every moved hostname. Confirm subdomains remain available as aliases without redirects that discard hostname-specific routing.

Remove the staging callback override, update the core and provider allowlists to the production callback, and verify `https://1shotcam.com/api/webhooks/callback` reaches this app. Check `portal`/`pay` open the payment module, `admin` opens the vault, and `ai`/`app` open the studio. Verify browser auth/callback URLs for each hostname; sessions are intentionally not forced to share credentials across subdomains.

Recheck the complete payment/AI/auth flows on the final domains, avoiding duplicate financial operations. Observe error rates and signed callback delivery after cutover.

## Rollback

If TLS, authentication, API routing or payment callbacks fail after the move, restore the recorded domain assignments and DNS, then restore the prior callback target. Keep this project's database and deployment for diagnosis; do not delete new orders or payment receipts. Reconcile every unconfirmed payment with the provider before retrying. A later retry of the transfer still follows the same verification gates.

## Recovering missing applied migrations

A "migrations have been removed after being applied" error blocks publication even when the application build succeeds. The cache-save warning is unrelated. Keep every applied migration under `netlify/database/migrations` with its original name and content, including the collaboration migration and the workforce catalog expansion:

- `20261018073311_workforce_collaboration/migration.sql`
- `20261018073311_workforce_collaboration/snapshot.json`
- `20261018073400_expand_workforce_catalog.sql`

Inspect the affected branch with `netlify db status --branch <affected-branch>`. Restore missing files from their original source revision. If that source is unavailable, use `netlify db migrations pull --branch <affected-branch>` in a separate, temporary copy linked to this project, then copy only the missing original SQL back to its original repository path. Pull overwrites the entire migration directory and does not restore Drizzle snapshots; preserve existing snapshots and recover any missing snapshots from the original source. Both top-level SQL files and directories containing `migration.sql` are supported. Do not rename existing migrations to match the layout returned by pull.

Compare recovered SQL with the affected branch's stored migration content and check status again before redeploying through the normal pipeline. Do not reset the database, manually apply SQL, edit applied migrations or generate duplicate migrations to work around missing history. A successful recovery is confirmed only when the new deployment passes migration validation and reaches Ready.

On 2026-10-18, all ten migrations were already present in the workspace and their SQL matched the applied preview history byte for byte. Status showed zero pending, missing or out-of-order migrations, so no restoration was needed in this checkout. Production history access returned HTTP 401; production migration integrity and the next deployment remained unverified.

## Recorded implementation-time findings

The 2026-10-18 remote review found a published site whose `/api/health` returned HTTP 200 with degraded status: Netlify Database was connected and the external core was disconnected. The external API certificate failed trust verification as self-signed. This supersedes the earlier health-path 404 observation. Chat and executive requests have since been changed in source to use Netlify AI Gateway without calling the VPS. Deployment of this change and authenticated inference remain to be verified by the pipeline and a signed-in session. Identity activation had completed. No domains or DNS records were changed, and no live payment was verified. The external payment certificate and provider compatibility remain release requirements.

## Workforce prototype release verification

After the platform applies the workforce schema and catalog migrations and validates the build, open `/workforce` and confirm the original storefront and existing workspace links remain available. Check the eight locale options, Urdu/Arabic direction, independent output language, keyboard access, reduced motion, mobile dialogs and light/dark themes. Legacy untranslated copy intentionally falls back to English outside Arabic.

Create two independent Identity accounts. Create each account's organization, and verify that neither can retrieve, approve, replay or modify the other's tasks or meeting IDs. Check account switching clears private UI. Confirm catalog reads omit employee system instructions and no task content enters the inspector.

Create a CEO task and email draft, observe persisted events, reload the page, approve the draft and confirm the status says mail connection is required with no outbound send. Replay the task and confirm it creates no events. Repeat a request with the same key and verify it returns the same task; a different payload with that key must be rejected. Test unknown/expired sessions, unavailable AI Gateway, provider timeout and network loss using the deployment validation environment.

Hold a meeting with and without prior task records. Confirm reports distinguish drafts, demos and approvals; save and reopen its minutes; approve a selected follow-up once and verify only one task is queued. Request revision, then start the queued CEO task explicitly. The current prototype does not provide Gmail/Salla authorization, recurring billing, background job recovery, a 500-profile catalog or validated employee qualifications. These are subsequent releases, not deploy prerequisites for an accurately labeled prototype. Confirm runtime AI Gateway allowance and external payment/TLS prerequisites separately before enabling dependent production features.

## Workforce mail, research and voice release checks

Keep all existing domain assignments until deployment verification succeeds. This change does not move the API hostname or modify DNS.

The new workforce tables and ten-role catalog seed are additive migrations. Let the deployment platform apply them. Existing applied migrations must remain unchanged. Confirm the API function package contains the Chromium binaries, Playwright and the mail/speech SDKs; verify Chromium launch under the deployed Node runtime and memory limit.

Use an owned test organization and controlled mailboxes to verify encrypted connection creation, SMTP verification, inbox sync/deduplication, reply drafting, edits, exact-content approval, SMTP acceptance and unknown-outcome handling. Verify simultaneous approval cannot send twice, interrupted sends remain unconfirmed, and another account cannot access connections, drafts, sessions or research results. Confirm the scheduled mailbox function runs in production and reports genuine connection status; preview scheduling may not run automatically. SMTP/IMAP network reachability and provider app-password policies are external prerequisites.

Check public search produces real source citations. For each intended portal, check the login form, same-origin restrictions, page evidence, explicit challenge state, session expiry and deletion. Do not advertise unsupported MFA/SSO/CAPTCHA flows or arbitrary write automation. Check network interception/private-address rejection and the absence of credentials in browser/API responses, logs and AI inputs. The session panel displays snapshots of page text, not a remote desktop feed.

Configure Azure Speech through the runtime administration panel if cloud speech is needed. Check Arabic and the other output languages without installed voices, denied microphone/motion permission, playback blocking, interruption and account switching on iOS Safari and Android Chrome. Confirm the 56px headers, compact composer, 320px layouts, pointer/joystick navigation, gyro calibration, task-driven monitors and reduced-motion behavior. No production credentials or messages were used during source editing, and none of these live checks is asserted to have passed yet.
