// Run with: npm test (Node's built-in runner with type stripping).
// Guards the gaming arsenal: dataset integrity, the loadout engine's output
// and the static pages it pre-renders.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  attachmentTypes,
  slotById,
  slots,
  statById,
  stats,
  styleById,
  styles,
  typeById,
  typesForSlot,
} from "../shared/gaming/attachments.ts";
import {
  CLASS_SIZE,
  classProfile,
  rankSlot,
  recommend,
  scoreType,
} from "../shared/gaming/engine.ts";
import {
  arsenalPath,
  classById,
  games,
  liveGames,
  weaponClasses,
  weaponsByClass,
} from "../shared/gaming/games.ts";
import { mw4 } from "../shared/gaming/mw4.ts";
import type { StyleId } from "../shared/gaming/types.ts";
import {
  buildSitemap,
  renderArsenalGame,
  renderArsenalHub,
  renderArsenalWeapon,
} from "../scripts/tools-prerender.ts";

const TEMPLATE =
  '<!doctype html><html lang="ar" dir="rtl"><head><title>x</title><link rel="canonical" href="https://www.1shotcam.com/" /><meta name="description" content="d" /></head><body><div id="root"></div></body></html>';
const styleIds = styles.map((s) => s.id);

test("Modern Warfare 4 carries its 33 launch weapons in the published split", () => {
  assert.equal(mw4.weapons.length, 33);
  const counts: Record<string, number> = {
    ar: 8,
    smg: 5,
    lmg: 3,
    marksman: 3,
    sniper: 3,
    shotgun: 2,
    pistol: 4,
    launcher: 4,
    melee: 1,
  };
  for (const [cls, expected] of Object.entries(counts))
    assert.equal(
      mw4.weapons.filter((w) => w.class === cls).length,
      expected,
      cls,
    );
});

test("weapon ids are unique, URL-safe and tagged with their own game", () => {
  for (const game of games) {
    const ids = new Set(game.weapons.map((w) => w.id));
    assert.equal(ids.size, game.weapons.length, game.id);
    for (const weapon of game.weapons) {
      assert.match(weapon.id, /^[a-z0-9]+(?:-[a-z0-9]+)*$/);
      assert.equal(weapon.game, game.id);
      assert.ok(classById[weapon.class], weapon.id);
      assert.ok(
        weapon.roleAr.length > 10 && weapon.roleEn.length > 10,
        weapon.id,
      );
    }
  }
});

test("every attachment belongs to a known family and to a slot the weapon has", () => {
  for (const game of games)
    for (const weapon of game.weapons)
      for (const attachment of weapon.attachments) {
        const type = typeById[attachment.type];
        assert.ok(type, `${weapon.id} → ${attachment.type}`);
        assert.equal(type.slot, attachment.slot, attachment.name);
        assert.ok(
          weapon.slots.includes(attachment.slot),
          `${weapon.id} has no ${attachment.slot} slot`,
        );
      }
});

test("published builds reference real slots, perks and dated sources", () => {
  for (const game of games)
    for (const weapon of game.weapons)
      for (const build of weapon.builds) {
        assert.ok(styleById[build.style], build.style);
        assert.ok(build.picks.length >= 3, weapon.id);
        for (const pick of build.picks)
          assert.ok(
            weapon.slots.includes(pick.slot),
            `${weapon.id} build uses missing slot ${pick.slot}`,
          );
        for (const perk of build.perks ?? [])
          assert.ok(
            game.perks.some((p) => p.id === perk),
            `${weapon.id} → ${perk}`,
          );
        const source = game.sources.find((s) => s.id === build.sourceId);
        assert.ok(source, `${weapon.id} → ${build.sourceId}`);
        assert.match(source.readOn, /^\d{4}-\d{2}-\d{2}$/);
        assert.match(source.url, /^https:\/\//);
      }
});

test("Apex attachments only block slots the weapon actually has", () => {
  for (const game of games)
    for (const weapon of game.weapons)
      for (const slot of weapon.apex?.blocks ?? [])
        assert.ok(
          weapon.slots.includes(slot),
          `${weapon.id} apex blocks missing slot ${slot}`,
        );
});

test("MW4 perks are pick-3 from 18, six per slot, with unique ids", () => {
  assert.equal(mw4.perks.length, 18);
  for (const slot of [1, 2, 3] as const)
    assert.equal(mw4.perks.filter((p) => p.slot === slot).length, 6, `${slot}`);
  assert.equal(new Set(mw4.perks.map((p) => p.id)).size, 18);
  for (const perk of mw4.perks)
    assert.ok(perk.doesAr.length > 10 && perk.doesEn.length > 10, perk.id);
});

test("every playstyle picks one perk per slot and weighs at least two axes", () => {
  for (const style of styles) {
    const perks = style.perks.map((id) => mw4.perks.find((p) => p.id === id));
    assert.equal(perks.length, 3, style.id);
    assert.deepEqual(
      perks.map((p) => p?.slot),
      [1, 2, 3],
      style.id,
    );
    const weights = Object.values(style.weights);
    assert.ok(weights.length >= 2, style.id);
    for (const weight of weights) assert.ok(weight > 0, style.id);
  }
});

test("families, slots and stats are internally consistent", () => {
  assert.equal(
    new Set(attachmentTypes.map((t) => t.id)).size,
    attachmentTypes.length,
  );
  for (const type of attachmentTypes) {
    assert.ok(slotById[type.slot], type.id);
    assert.ok(Object.keys(type.effects).length > 0, type.id);
    for (const stat of Object.keys(type.effects))
      assert.ok(
        statById[stat as keyof typeof statById],
        `${type.id} → ${stat}`,
      );
    assert.ok(type.doesAr.length > 10 && type.doesEn.length > 5, type.id);
    assert.ok(type.costAr.length > 5 && type.costEn.length > 5, type.id);
  }
  assert.equal(new Set(slots.map((s) => s.id)).size, slots.length);
  assert.equal(new Set(stats.map((s) => s.id)).size, stats.length);
  assert.equal(
    new Set(weaponClasses.map((c) => c.id)).size,
    weaponClasses.length,
  );
});

test("every slot a weapon exposes has at least one family to choose from", () => {
  for (const game of games)
    for (const weapon of game.weapons)
      for (const slot of weapon.slots)
        assert.ok(typesForSlot(slot).length > 0, `${weapon.id} → ${slot}`);
});

test("the engine returns a bounded class of distinct, helpful slots", () => {
  for (const game of liveGames())
    for (const weapon of game.weapons)
      for (const style of styleIds) {
        const result = recommend(game, weapon, style);
        assert.ok(result.picks.length <= CLASS_SIZE, weapon.id);
        assert.equal(
          new Set(result.picks.map((p) => p.slot)).size,
          result.picks.length,
          `${weapon.id} repeated a slot`,
        );
        for (const pick of result.picks) {
          assert.ok(pick.score > 0, `${weapon.id} → ${pick.type.id}`);
          assert.ok(weapon.slots.includes(pick.slot), weapon.id);
          if (pick.attachment) assert.equal(pick.attachment.slot, pick.slot);
        }
        assert.equal(result.perks.length, 3, weapon.id);
        // Weapons that take no attachments must produce no class at all.
        if (!weapon.slots.length) assert.equal(result.picks.length, 0);
        else assert.ok(result.picks.length > 0, weapon.id);
      }
});

test("the engine never pairs a suppressed barrel with a muzzle suppressor", () => {
  const redundant = ["light-silencer", "heavy-silencer"];
  for (const game of liveGames())
    for (const weapon of game.weapons)
      for (const style of styleIds) {
        const ids = recommend(game, weapon, style).picks.map((p) => p.type.id);
        if (ids.includes("silenced-barrel"))
          for (const id of redundant)
            assert.ok(!ids.includes(id), `${weapon.id} → ${style}`);
      }
});

test("a stealth class never equips a laser, which gives the position away", () => {
  for (const game of liveGames())
    for (const weapon of game.weapons) {
      const picks = recommend(game, weapon, "stealth").picks;
      assert.ok(
        picks.every((pick) => pick.slot !== "laser"),
        weapon.id,
      );
    }
});

test("each style actually changes the class it produces", () => {
  const weapon = mw4.weapons.find((w) => w.id === "han-86");
  assert.ok(weapon);
  const classes = new Map<StyleId, string>();
  for (const style of styleIds)
    classes.set(
      style,
      recommend(mw4, weapon, style)
        .picks.map((p) => `${p.slot}:${p.type.id}`)
        .sort()
        .join("|"),
    );
  assert.equal(new Set(classes.values()).size, styleIds.length);
  // The aggressive class must favour movement; the long class must favour range.
  const profile = (style: StyleId) =>
    new Map(
      classProfile(recommend(mw4, weapon, style).picks).map((row) => [
        row.stat,
        row.value,
      ]),
    );
  assert.ok((profile("speed").get("mobility") ?? 0) > 0);
  assert.ok((profile("range").get("range") ?? 0) > 0);
  assert.ok((profile("stealth").get("stealth") ?? 0) > 0);
  assert.ok((profile("accuracy").get("recoil") ?? 0) > 0);
});

test("scoring is deterministic and ranks a slot from best to worst", () => {
  const weapon = mw4.weapons.find((w) => w.id === "iso-nightshade");
  assert.ok(weapon);
  const ranked = rankSlot(weapon, "stock", styleById.speed.weights);
  assert.ok(ranked.length > 1);
  for (let i = 1; i < ranked.length; i += 1)
    assert.ok(ranked[i - 1].score >= ranked[i].score);
  assert.equal(ranked[0].type.id, "no-stock");
  assert.equal(
    scoreType(ranked[0].type, styleById.speed.weights),
    scoreType(ranked[0].type, styleById.speed.weights),
  );
  assert.ok(classProfile(ranked.slice(0, 1)).every((row) => row.value !== 0));
});

test("games without a gathered dataset expose nothing and are never live", () => {
  for (const game of games) {
    if (game.weapons.length) {
      assert.match(game.checkedOn, /^\d{4}-\d{2}-\d{2}$/);
      assert.ok(game.patch.length > 0, game.id);
      assert.ok(game.sources.length >= 3, game.id);
      assert.ok(game.perks.length > 0, game.id);
    } else {
      assert.equal(game.perks.length, 0, game.id);
      assert.equal(game.sources.length, 0, game.id);
      assert.ok(!liveGames().includes(game), game.id);
    }
  }
  assert.ok(liveGames().length >= 1);
  assert.ok(weaponsByClass(mw4).every((group) => group.weapons.length > 0));
});

test("arsenal pages pre-render with Arabic content, canonical URLs and sources", () => {
  const hub = renderArsenalHub(TEMPLATE);
  assert.ok(
    hub.includes(
      `<link rel="canonical" href="https://www.1shotcam.com${arsenalPath()}"`,
    ),
  );
  assert.ok(hub.includes('lang="ar" dir="rtl"'));
  assert.ok(hub.includes(mw4.ar));

  const gamePage = renderArsenalGame(TEMPLATE, mw4);
  assert.ok(
    gamePage.includes(
      `<link rel="canonical" href="https://www.1shotcam.com${arsenalPath(mw4.id)}"`,
    ),
  );
  for (const weapon of mw4.weapons)
    assert.ok(gamePage.includes(arsenalPath(mw4.id, weapon.id)), weapon.id);

  const weapon = mw4.weapons.find((w) => w.id === "kg-7-vulcan");
  assert.ok(weapon);
  const page = renderArsenalWeapon(TEMPLATE, mw4, weapon);
  assert.ok(page.includes(weapon.name));
  assert.ok(page.includes(mw4.checkedOn));
  assert.ok(page.includes(weapon.apex?.name ?? ""));
  assert.ok(!page.includes('href="https://www.1shotcam.com/" />'));
});

test("sitemap covers the arsenal hub, each live game and every weapon", () => {
  const xml = buildSitemap("");
  assert.ok(xml.includes(`https://www.1shotcam.com${arsenalPath()}</loc>`));
  for (const game of liveGames()) {
    assert.ok(
      xml.includes(`https://www.1shotcam.com${arsenalPath(game.id)}</loc>`),
      game.id,
    );
    for (const weapon of game.weapons)
      assert.ok(
        xml.includes(
          `https://www.1shotcam.com${arsenalPath(game.id, weapon.id)}</loc>`,
        ),
        weapon.id,
      );
  }
});
