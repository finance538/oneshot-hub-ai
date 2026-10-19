# Marketing localization and brand review

The home page and `/workforce` market introduction use the same eight-language marketing catalog. Selecting a language immediately changes audience positioning, the headline, market examples, the two workspace entry cards, all comparison dimensions, credibility cards, the Brand Studio call to action and the page title. Language and theme travel with internal entry links. Arabic and Urdu use RTL. Other legacy storefront content retains its existing translation coverage.

| Language           | Audience and examples                                                                          |
| ------------------ | ---------------------------------------------------------------------------------------------- |
| Arabic             | Saudi/Gulf and Arab commerce; Salla, Zid, Shopify and WhatsApp; Arabic/Gulf communication      |
| English            | Global founders and e-commerce; Shopify, WooCommerce, Stripe and Gmail                         |
| French             | Francophone merchants in Europe and Africa; Shopify, PrestaShop and Gmail                      |
| Turkish            | Turkish-speaking store owners; Trendyol, Shopify and Gmail                                     |
| Spanish            | Businesses in Spain and Latin America; Shopify, WooCommerce and Gmail                          |
| Simplified Chinese | Cross-border merchants expanding internationally; Shopify, WooCommerce and Gmail               |
| Hindi              | Growing stores, startups and digital services; Shopify, WooCommerce and Gmail                  |
| Urdu               | Urdu-speaking merchants in Pakistan, the Gulf and worldwide; Shopify, WooCommerce and WhatsApp |

These are market examples, not connector or partnership badges. No independent evidence establishes a first-to-market or market-leadership ranking, so the positioning emphasizes an integrated workspace for each language's audience without using unsupported “first” claims or implying foreign incorporation. The headquarters description follows the current illustrated office implementation. Voice requires configured services and device permission; the CEO is advisory, mail requires connection and approval, and research uses returned sources. No new execution capability is implied by the marketing update.

## Brand options

The public HTTPS page at [brand.1shotcam.com](https://brand.1shotcam.com) and the JavaScript/CSS assets it served were inspected on 2026-10-19. They expose six named identities. The colors below are reference values from that public catalog, not changes to application-wide tokens.

| Identity            | Named direction | Reference accents                  | Suitable use                                                                                                                      |
| ------------------- | --------------- | ---------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| OneShot             | Solar Summer    | Orange `#F97316`, amber `#F59E0B`  | Best match for the public platform and unified marketing: charcoal surfaces, warm primary actions and a recognizable master brand |
| OneShot AI          | Frost Winter    | Cyan `#06B6D4`, sky `#38BDF8`      | Optional dedicated AI campaign assets; adopting it globally would change the established orange identity                          |
| OneShot Pay         | Copper Autumn   | Copper `#D97706`, gold `#FBBF24`   | Payment-specific brand materials                                                                                                  |
| OneShot Brand       | Prism Spring    | Emerald `#10B981`, rose `#F43F5E`  | The separate logo, identity and asset studio                                                                                      |
| OneShot Workflow    | Equinox Dusk    | Yellow `#EAB308`, violet `#8B5CF6` | Reference for executive/workflow campaign composition; keep the current product palette for continuity                            |
| OneShot Loader Test | Eclipse Lab     | Green `#22C55E`, lime `#84CC16`    | Diagnostics and developer tooling, not the main merchant-facing identity                                                          |

The implemented choice keeps the existing charcoal panels, restrained orange, IBM Plex Sans Arabic and Outfit. It uses a compact, editorial workspace panel with numbered chat/office entries and restrained emphasis on the oneShot comparison column. Green is not used to imply an unverified connection or successful operation. The site's other palettes remain reference options rather than new theme settings.

The published studio supports these entry points:

- [Logo & mark foundry](https://brand.1shotcam.com/?studio=1): logo variants and layouts; this is the new marketing call-to-action destination.
- [Image & asset extractor](https://brand.1shotcam.com/?studio=2): asset packages and PNG/WebP/SVG export options.
- [Color & token lab](https://brand.1shotcam.com/?studio=3): palettes and design tokens.
- [Typography & languages](https://brand.1shotcam.com/?studio=4): eight-language typography, including Noto script options for Chinese, Hindi and Urdu.
- [Promo & banner studio](https://brand.1shotcam.com/?studio=7): campaign graphics.
- [Developer exports](https://brand.1shotcam.com/?studio=8): implementation assets and export formats.

The call to action opens the external studio in a separate tab. This change does not add shared sign-in, saved brand presets, embedded studio tooling or cross-site language synchronization. The inspected studio initializes its own locale and accepts a `studio` query parameter for navigation. Its public asset metadata contains some example domain strings that differ from the supplied hostname; links here deliberately use the user-supplied, successfully fetched `brand.1shotcam.com`. No domain assignments or DNS were changed. Export generation and authenticated studio operations were not exercised.

## Validation scope

Edited sources were formatted and inspected. Build, test, typecheck and dev-server commands were not run under the repository's agent-run policy. The platform still needs to validate the application, followed by browser review of all eight languages at 320px, tablet and desktop widths, both themes, Arabic/Urdu RTL, keyboard comparison controls, horizontal table scrolling and both workspace entry links. The external studio's exports and the application's authenticated AI, mail, research and speech features retain their existing runtime dependencies. No successful deployment or external operation is asserted.
