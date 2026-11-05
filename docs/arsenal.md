# Gaming arsenal — data and the seasonal refresh

`/tools/arsenal` is the gaming section's stepped tool: **game → weapon → playstyle → class**.
It answers one question for a Call of Duty player: _given this weapon and how I like to
play, which attachments do I put on it, what does each one actually do, and what do I give
up?_ It also lists the perks that fit the style, the weapon's Apex attachment, and the
builds other sites have published, each with its source and the date it was read.

## Where the data lives

| File                           | What it holds                                                                                                       |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------- |
| `shared/gaming/types.ts`       | The data contracts: games, weapons, slots, attachments, builds, perks.                                              |
| `shared/gaming/attachments.ts` | Attachment families, handling axes, Gunsmith slots and the five playstyles with their weights. Game-independent.    |
| `shared/gaming/mw4.ts`         | Modern Warfare 4: 33 weapons, slot sets, 18 perks, published builds, sources.                                       |
| `shared/gaming/games.ts`       | The game registry and the `/tools/arsenal` URL shape. Titles with an empty roster are listed as "not gathered yet". |
| `shared/gaming/engine.ts`      | The scoring: style weights × family effects → the recommended class. Pure, deterministic, no network.               |
| `src/tools/Arsenal.tsx`        | The four-step UI, lazy-loaded so the dataset never touches the main tools bundle.                                   |
| `scripts/tools-prerender.ts`   | Static HTML for the hub, each game and each weapon, plus the sitemap entries.                                       |
| `tests/arsenal.test.ts`        | Dataset integrity, engine behaviour and the pre-rendered pages.                                                     |

## The two layers, and why

**Families, not just names.** Every attachment in the game belongs to a family the Gunsmith
names itself — Long Barrel, Light Barrel, Tactical Stock, Balanced Comp, Heavy Silencer. A
family's _direction_ is stable across seasons: a long barrel always buys range and velocity
with mobility. The exact percentages are not stable: they are retuned every season and
differ per weapon. So the dataset records direction only, on a −2…+2 scale, and the UI says
plainly that the real numbers live in the in-game Gunsmith. **Never put percentages in this
data**; they would be wrong within weeks and the tool would be lying confidently.

**Weapon-specific names on top.** Where the exact in-game attachment for a family on a
weapon is known, it sits in that weapon's `attachments` with its family id, and the UI shows
the real name. Where it is not known, the family name is shown with "pick any attachment
from this family". That is why coverage can grow weapon by weapon without the tool ever
showing a made-up attachment name.

## The seasonal refresh

Call of Duty ships a season roughly every two months, plus mid-season reloaded patches, and
each one adds weapons and retunes attachments. The data is therefore stamped, not assumed
fresh: every game carries `patch` and `checkedOn`, both shown to the visitor on the page.
Run this when a season or a reloaded patch lands:

1. **New weapons.** Read the official launch or season blog on `callofduty.com` for the
   season's weapons and their classes, then add each one to the game's `weapons` with its
   class, fire rate, magazine, unlock level, max level, role and slot set.
2. **Slot changes.** The official post lists which slots each class exposes and every
   exception (the Oden's Comb in place of a Rear Grip, the PPSh-41's Fire Mods). Fix the slot
   sets before the builds, because `tests/arsenal.test.ts` rejects any build or Apex that
   references a slot its weapon does not have.
3. **Perks.** Re-read the perk list only if the patch notes mention perks: slots and effects
   do move between titles and occasionally between seasons.
4. **Builds.** Replace the `builds` entries for the weapons the patch touched, quoting each
   source as published and updating its `readOn`. Delete a build rather than leave a stale
   one; a dated build the visitor can judge is worth more than an undated one they cannot.
5. **Stamp it.** Update `patch` and `checkedOn` on the game. These two fields are the honest
   part of the feature — if they are not updated, the page will say the data is older than it
   is, which is the one failure mode that matters here.
6. **Verify.** `npm test` covers the dataset's integrity; the platform runs it on deploy.

Buffs and nerfs that only change numbers need no data change: the families' directions do
not move, and the published builds carry their own dates.

## Adding another Call of Duty title

The registry already names Black Ops 7, Warzone, Black Ops 6 and Modern Warfare III with an
empty roster, so the UI lists them and says their data has not been gathered. To make one
live, add a `shared/gaming/<game>.ts` in the shape of `mw4.ts` and swap its `pending(...)`
entry in `games.ts` for the real game. Everything else — routing, pre-rendering, sitemap,
the UI and the engine — picks it up with no further change, because they all iterate
`liveGames()`.

Warzone is the one that needs a decision first: its arsenal is inherited from whichever
titles are currently integrated with it, so it should either reference those games' weapons
or carry its own Warzone-tuned builds, not duplicate a roster that would drift.

## What this tool deliberately does not do

- No percentages, TTK tables or tier lists of its own. Those need live telemetry the tool
  does not have; publishing invented ones would be the fastest way to lose a player's trust.
- No account or match data. The tool runs entirely in the browser and sends nothing.
- No claim to be the meta. The generated class is ours and explained; the published builds
  are other people's opinions, attributed and dated.
