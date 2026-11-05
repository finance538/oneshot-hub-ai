// Game registry for the arsenal tool. Only games with a checked weapon
// dataset expose weapons; the rest are listed with an empty roster so the UI
// can say plainly that their data has not been gathered yet instead of
// inventing one.
import { mw4 } from "./mw4.ts";
import type { Game, GameId, Named, WeaponClassId } from "./types.ts";

export const weaponClasses: (Named & { id: WeaponClassId; order: number })[] = [
  { id: "ar", ar: "رشاشات هجومية", en: "Assault rifles", order: 1 },
  { id: "smg", ar: "رشاشات قصيرة", en: "SMGs", order: 2 },
  { id: "lmg", ar: "رشاشات ثقيلة", en: "LMGs", order: 3 },
  { id: "marksman", ar: "بنادق رماية", en: "Marksman rifles", order: 4 },
  { id: "sniper", ar: "قناصات", en: "Sniper rifles", order: 5 },
  { id: "shotgun", ar: "شوتقن", en: "Shotguns", order: 6 },
  { id: "pistol", ar: "مسدسات", en: "Pistols", order: 7 },
  { id: "launcher", ar: "قاذفات", en: "Launchers", order: 8 },
  { id: "melee", ar: "سلاح أبيض", en: "Melee", order: 9 },
];

export const classById = Object.fromEntries(
  weaponClasses.map((c) => [c.id, c]),
) as Record<WeaponClassId, (typeof weaponClasses)[number]>;

/** A title we name but whose arsenal has not been gathered yet. */
const pending = (
  g: Omit<Game, "weapons" | "perks" | "sources" | "patch" | "checkedOn">,
): Game => ({
  ...g,
  patch: "",
  checkedOn: "",
  weapons: [],
  perks: [],
  sources: [],
});

export const games: Game[] = [
  mw4,
  pending({
    id: "bo7",
    name: "Call of Duty: Black Ops 7",
    ar: "بلاك أوبس 7",
    short: "BO7",
    year: 2025,
    emoji: "🕶️",
    blurbAr: "إصدار 2025 من تريارك، ويشترك مع وارزون في المواسم والتوازن.",
    blurbEn:
      "Treyarch's 2025 title, sharing seasons and balancing with Warzone.",
  }),
  pending({
    id: "warzone",
    name: "Call of Duty: Warzone",
    ar: "وارزون",
    short: "Warzone",
    year: 2020,
    emoji: "🪂",
    blurbAr: "الباتل رويال المجاني، أسلحته تأتي من الإصدارات المدمجة معه.",
    blurbEn:
      "The free battle royale; its guns come from the integrated titles.",
  }),
  pending({
    id: "bo6",
    name: "Call of Duty: Black Ops 6",
    ar: "بلاك أوبس 6",
    short: "BO6",
    year: 2024,
    emoji: "🎖️",
    blurbAr: "إصدار 2024، وأسلحته ما زالت متاحة في وارزون.",
    blurbEn: "The 2024 title, with its weapons still available in Warzone.",
  }),
  pending({
    id: "mw3",
    name: "Call of Duty: Modern Warfare III",
    ar: "مودرن وورفير 3",
    short: "MW3",
    year: 2023,
    emoji: "🔰",
    blurbAr: "إصدار 2023 بترسانة ضخمة موروثة من مودرن 2.",
    blurbEn: "The 2023 title, with a large arsenal inherited from MW2.",
  }),
];

/** Canonical URL for a step of the arsenal tool. */
export const arsenalPath = (gameId?: string, weaponId?: string) =>
  ["/tools/arsenal", gameId, weaponId].filter(Boolean).join("/");

export const gameById = Object.fromEntries(
  games.map((g) => [g.id, g]),
) as Record<GameId, Game>;

export const isGameId = (value: unknown): value is GameId =>
  typeof value === "string" && value in gameById;

/** Games whose roster has been gathered and dated. */
export const liveGames = () => games.filter((g) => g.weapons.length > 0);

export const findGame = (id: unknown) =>
  isGameId(id) ? gameById[id] : undefined;

export const findWeapon = (game: Game, weaponId: unknown) =>
  typeof weaponId === "string"
    ? game.weapons.find((w) => w.id === weaponId)
    : undefined;

/** Weapons of one game grouped by class, in class order. */
export function weaponsByClass(game: Game) {
  return weaponClasses
    .map((c) => ({
      class: c,
      weapons: game.weapons.filter((w) => w.class === c.id),
    }))
    .filter((group) => group.weapons.length > 0);
}
