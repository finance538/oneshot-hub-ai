# OneShot Ecosystem

## Architecture

This is an Arabic RTL React/TypeScript application built with Vite and deployed to Netlify. It is not the previous TanStack template: the resumed workspace contained no source files and the scaffold service was unavailable. Use the actual checked-in application as the source of truth.

- `src/App.tsx`: shell, domain/query navigation, catalog/health fetches, checkout initiation and owned orders.
- `src/components`: store, gateway controls, vault, live inspector, auth, AI chat, executive and common presentation.
- `src/lib/api.ts`: JSON-aware API calls, sanitized inspector events, account-generation guard and formatting.
- `shared/contracts.ts`: shared provider/topology/protection definitions and client data contracts.
- `netlify/functions/api.mts`: modern Function routing, auth and JSON responses; aliases converge on the same authenticated handlers.
- `netlify/lib`: server-only security, core integration, payments and AI.
- `db`: lazy Drizzle client and schema. Persistent data MUST use Netlify Database.
- `netlify/database/migrations`: generated schema migration and the business catalog seed; the platform applies them.
- `public`: original logo, generated image concepts and publish-directory redirects.
- `docs/deployment.md`: conditional domain transition and release verification.

## Conventions

Use Arabic product copy and semantic native controls; keep English identifiers and provider names where useful. The design uses IBM Plex Sans Arabic/Outfit, charcoal panels, restrained orange accents and emerald for verified success. Use Lucide icons and Netlify Image CDN. Keep loading/empty/error states truthful. Catalog records and operational metrics come from the database. Constants describing product requirements, gateway names and topology choices are configuration, not simulated operations.

Keep runtime secrets and database access in server modules. Read runtime configuration through `Netlify.env.get`. Never print secrets or raw upstream payloads. Credentials are encrypted with AES-256-GCM and provider/environment AAD; never return ciphertext or decrypted values to the browser. Administrator roles come from Identity, not user-editable metadata. Remount private UI on account changes.

Do not collect PAN or CVV. Hosted checkout or official provider tokens are required. Production protections cannot be disabled. Six-mode diagnostics never create multiple charges. Financial mutations must not be blindly retried after HTML, timeout or transport failure. Preserve and reuse the idempotency key for unknown outcomes, and keep orders unconfirmed until reconciled or confirmed by an authenticated callback.

Callbacks use a normalized HMAC protocol from the core, not seven native provider protocols. Require signature verification and authoritative amount/currency/environment/gateway matching, with transactional replay protection. Never mark payment successful based on an iframe event or upstream text. Guard against late checkout replies overwriting callback-confirmed status.

Netlify database stores application records; the VPS is a processing dependency. VPS database verification and compatibility of the core `credentials` contract are not established. Always verify TLS. Never introduce an HTTP fallback for sensitive payloads or disable certificate verification.

AI CEO is advisory. Preserve owned conversations and role checks. Do not expose execution tools to arbitrary prompts. Gemini uses the official SDK and approved models; read the current AI Gateway guidance before changing models. Browser dictation is not a server transcription engine.

## Deployment rules

During agent runs, do not run build/test/typecheck/dev-server commands; the platform validates automatically. Inspect edited files instead. Dependency installation, formatting and migration generation are allowed. Never inspect `.git` or create commits/PRs. Do not apply migrations manually. Schema changes need a new migration, and deployed migrations are immutable.

The user authorized moving existing custom domains only after successful deployment and verification. That approval remains valid; do not ask again. The owner is preparing TLS, runtime secrets, merchant credentials and admin role through administration panels. Do not assume these settings are complete. Until verified, preserve existing assignments and DNS. Never move the API hostname away from the VPS. Do not claim a successful deploy, payment or domain transfer without evidence.

Keep README and `.netlify/results.md` aligned with the finished implementation and remaining external dependencies. No subagent delegation is requested by these instructions.
