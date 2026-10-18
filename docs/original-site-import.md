# Original OneShot storefront import

Source: https://github.com/finance538/oneshot-ai-google-

Pinned revision: `a9160bae7fcfb588dc35c6b532610ac97ca2b1be` (reviewed October 17, 2026).

The public Brand Studio storefront was ported into the existing React application, retaining the source layout, logo, editorial imagery, catalog categories, service specifications, media packages, policies and Arabic/English content. It replaces the earlier four-product storefront. The authenticated gateway, vault and executive modules remain the destination implementation. The former AI Studio module has since been retired in favor of the `/workforce` experience; the photography storefront's business branding remains intact.

## Content mapping

| Source                                                                       | Destination                                                                     |
| ---------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| `src/Storefront.tsx`, `src/storefront.css`                                   | Adapted under `src/storefront/`                                                 |
| `src/storefront/catalog.ts`                                                  | 48 product rows and complete `catalog_details` in the new content migration     |
| `src/storefront/catalog-en.ts`                                               | English service copy in those database records                                  |
| `src/storefront/media.ts`                                                    | Four media package rows and one Google Ads package row                          |
| `src/storefront/documents.ts`                                                | Seven company/legal pages retained; integration page adapted to the current API |
| `public/images/`, `public/oneshot.svg`                                       | 55 copied assets; photographs use Image CDN                                     |
| Source authentication, wallets, subscriptions, payments, AI server functions | Existing destination services retained; source backend not imported             |

Catalog amounts, currencies, starting-price flags, billing cycles, source order, delivery days, revision terms, deliverables and exclusions are retained. The five packages remain on their original homepage sections; the catalog shows its original 48 service records across eight categories. Three services marked `needs_creation_and_testing` in the source remain visible with requests disabled; their status is not promoted to available. Original data and translations are stored in Netlify Database, loaded through the existing products endpoint. Unavailable data produces a loading/error state instead of sample inventory.

The source's service request dialog sends the selected SKU, title and published price through user-initiated WhatsApp/email links. No message is sent automatically and no payment or persisted order is implied. Catalog services are blocked from direct execution in the local payment handler until a quoted workflow is implemented. This prevents starting prices and monthly listings from being treated as immediately collectible final amounts.

Source product documents are service briefs, not the purchased digital files. Customer records, merchant balances, transaction history and credentials are not included in this repository import. No migration of those private datasets was attempted. The source WhatsApp/support channels were preserved; ownership and availability were not independently verified.

The original source includes wallet, commissions, invoice/subscription scheduling, licence management and native Android features which depend on its separate backend. Those services were not transplanted into the existing core. Unsupported wallet/APK actions were removed from the public storefront; current authentication, owned-order inspection and advisory AI workspaces were connected instead. This does not claim complete merchant-backend feature parity.

## Import reproducibility

`scripts/import-original-catalog.mjs` accepts a local copy of the pinned source and a **new** SQL migration output path. It reads TypeScript literal data using the TypeScript parser without executing source code, generates the category presentation configuration, and prepares 53 database rows. It does not connect to a database. Applied migrations must never be regenerated or edited.

The schema migration adding `catalog_details` precedes the data migration. Four legacy product rows are deactivated without deleting them or breaking existing order references. The platform applies migrations at deployment; neither migration was applied manually.

## Review and remaining release work

Edited source files and local imports were inspected and formatting completed. No build, typecheck, test or dev-server command was run. The platform still needs to validate the deployment and migrations, followed by browser verification of public routes, mobile layout, localized copy, original image delivery, account changes, quote actions and owned-order access.

The VPS origin, TLS policy, request aliases, encrypted credentials, signed callbacks and AI models were retained. Runtime secrets, merchant setup, core compatibility and trusted TLS remain external dependencies. No DNS or custom-domain assignment was changed and no deployment, live payment or domain transfer is claimed by this import.
