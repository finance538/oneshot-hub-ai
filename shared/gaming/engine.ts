// Loadout engine: turns a weapon plus a playstyle into a ranked set of
// attachment families, the exact in-game attachment when the dataset knows
// one for that weapon, and the perks that match the style.
//
// Pure math over the data in attachments.ts and the game files. No network,
// no storage, no randomness — the same weapon and style always produce the
// same class, which is what makes the result testable and pre-renderable.
import { styleById, typesForSlot } from "./attachments.ts";
import type {
  Attachment,
  AttachmentType,
  Effects,
  Game,
  Perk,
  SlotPick,
  Recommendation,
  SlotId,
  StatId,
  Style,
  StyleId,
  Weapon,
} from "./types.ts";

/** How many attachments a generated class recommends. */
export const CLASS_SIZE = 5;

/** Weighted sum of a family's effects under one style. */
export function scoreType(type: AttachmentType, weights: Effects): number {
  let score = 0;
  for (const [stat, weight] of Object.entries(weights) as [StatId, number][])
    score += weight * (type.effects[stat] ?? 0);
  return Math.round(score * 100) / 100;
}

/** The exact attachment on this weapon that belongs to a family, if any. */
export function attachmentFor(
  weapon: Weapon,
  type: AttachmentType,
): Attachment | undefined {
  return weapon.attachments.find(
    (a) => a.type === type.id && a.slot === type.slot,
  );
}

/**
 * Every family available in one slot, best first for this style. Used for the
 * "what does each one do" table, so families that hurt the style are kept and
 * shown with a negative score rather than hidden.
 */
export function rankSlot(
  weapon: Weapon,
  slot: SlotId,
  weights: Effects,
): SlotPick[] {
  return typesForSlot(slot)
    .map((type) => ({
      slot,
      type,
      attachment: attachmentFor(weapon, type),
      score: scoreType(type, weights),
    }))
    .sort((a, b) => b.score - a.score || a.type.id.localeCompare(b.type.id));
}

/** Perk ids a style leans on, resolved against the game's perk list. */
export function perksFor(game: Game, style: Style): Perk[] {
  return style.perks
    .map((id) => game.perks.find((p) => p.id === id))
    .filter((p): p is Perk => Boolean(p))
    .sort((a, b) => a.slot - b.slot);
}

/**
 * Families that do the same job twice. A barrel with the suppressor built in
 * makes a muzzle suppressor pointless, so the weaker of the two is dropped and
 * that slot falls back to its next-best family.
 */
const CONFLICTS: string[][] = [
  ["silenced-barrel", "light-silencer", "heavy-silencer"],
];

/** Drops redundant picks, re-filling the freed slot with its next option. */
function resolveConflicts(
  ranked: SlotPick[][],
  chosen: SlotPick[],
): SlotPick[] {
  let result = chosen;
  for (const group of CONFLICTS) {
    const hits = result.filter((pick) => group.includes(pick.type.id));
    if (hits.length < 2) continue;
    // Keep the strongest; every other slot falls back to its next family.
    const keep = hits.reduce((a, b) => (b.score > a.score ? b : a));
    result = result
      .map((pick) => {
        if (pick === keep || !group.includes(pick.type.id)) return pick;
        const list = ranked.find((options) => options[0]?.slot === pick.slot);
        return (
          list
            ?.slice(1)
            .find(
              (option) => !group.includes(option.type.id) && option.score > 0,
            ) ?? null
        );
      })
      .filter((pick): pick is SlotPick => pick !== null);
  }
  return result.sort(
    (a, b) => b.score - a.score || a.slot.localeCompare(b.slot),
  );
}

/**
 * The recommended class: the best family in each slot, then the strongest
 * `limit` of those, since a weapon carries only a few attachments at a time.
 * Slots where nothing helps the style are left empty on purpose.
 */
export function recommend(
  game: Game,
  weapon: Weapon,
  styleId: StyleId,
  limit = CLASS_SIZE,
): Recommendation {
  const style = styleById[styleId];
  const ranked = weapon.slots.map((slot) =>
    rankSlot(weapon, slot, style.weights),
  );
  const best = ranked
    .map((list) => list[0])
    .filter((pick): pick is SlotPick => Boolean(pick) && pick.score > 0);
  const picks = resolveConflicts(ranked, best).slice(0, limit);
  return {
    weapon,
    style,
    picks,
    perks: perksFor(game, style),
    build: weapon.builds.find((b) => b.style === styleId),
  };
}

/** Published builds for a weapon, the matching style first. */
export function buildsFor(weapon: Weapon, styleId?: StyleId) {
  if (!styleId) return weapon.builds;
  return [...weapon.builds].sort(
    (a, b) => Number(b.style === styleId) - Number(a.style === styleId),
  );
}

/**
 * Net effect of a class on each handling axis, for the summary bars. Values
 * stay directional: they add up the families' own -2…+2 figures.
 */
export function classProfile(
  picks: SlotPick[],
): { stat: StatId; value: number }[] {
  const totals = new Map<StatId, number>();
  for (const pick of picks)
    for (const [stat, value] of Object.entries(pick.type.effects) as [
      StatId,
      number,
    ][])
      totals.set(stat, (totals.get(stat) ?? 0) + value);
  return [...totals.entries()]
    .map(([stat, value]) => ({ stat, value: Math.round(value * 10) / 10 }))
    .filter((row) => row.value !== 0)
    .sort((a, b) => b.value - a.value);
}
