// Gaming arsenal: Call of Duty weapons, attachment slots and loadout data.
// Pure data and math shared by the browser UI, the build-time pre-renderer
// and the tests. Nothing here touches the network, storage or secrets.
//
// Everything is editable reference data, not a live feed from the game.
// Each game carries `patch` and `checkedOn` so the UI can state plainly how
// current the data is; see docs/arsenal.md for the refresh procedure.

export type GameId = "mw4" | "bo7" | "warzone" | "bo6" | "mw3";

export type WeaponClassId =
  | "ar"
  | "smg"
  | "lmg"
  | "marksman"
  | "sniper"
  | "shotgun"
  | "pistol"
  | "launcher"
  | "melee";

/** Gunsmith slots. Which ones a weapon exposes is per weapon, not per class. */
export type SlotId =
  | "optic"
  | "muzzle"
  | "barrel"
  | "underbarrel"
  | "magazine"
  | "rearGrip"
  | "stock"
  | "laser"
  | "ammunition"
  | "bolt"
  | "guard"
  | "triggerAction"
  | "comb"
  | "fireMods";

/** What the player is optimising for. Drives the attachment scoring. */
export type StyleId = "speed" | "accuracy" | "range" | "stealth" | "balanced";

/**
 * Handling axes an attachment can move. Values in data are directional
 * (-2 … +2), never exact in-game percentages: tuning changes every season
 * and differs per weapon, so only the direction of the trade-off is stable.
 */
export type StatId =
  | "mobility"
  | "adsSpeed"
  | "recoil"
  | "range"
  | "velocity"
  | "steadiness"
  | "hipfire"
  | "stealth"
  | "ammo"
  | "flinch";

export type Effects = Partial<Record<StatId, number>>;

export interface Named {
  id: string;
  ar: string;
  en: string;
}

export interface Stat extends Named {
  id: StatId;
  /** Short Arabic explanation shown in the legend. */
  noteAr: string;
  noteEn: string;
}

export interface Style extends Named {
  id: StyleId;
  emoji: string;
  blurbAr: string;
  blurbEn: string;
  weights: Effects;
  /** Perk ids this style leans on, in slot order. */
  perks: string[];
}

export interface Slot extends Named {
  id: SlotId;
  order: number;
}

/**
 * An attachment family (MW4 labels them in the Gunsmith: Long Barrel, Light
 * Stock, Balanced Comp …). `examples` are real attachment names seen in game;
 * weapon-specific names live on the weapon so the UI can show the exact pick.
 */
export interface AttachmentType extends Named {
  slot: SlotId;
  effects: Effects;
  /** What it does, in plain Arabic. */
  doesAr: string;
  doesEn: string;
  /** What you give up. Empty when the family has no real downside. */
  costAr: string;
  costEn: string;
}

/** A concrete attachment on one weapon, tied to its family. */
export interface Attachment {
  slot: SlotId;
  type: string;
  name: string;
  /** Weapon level that unlocks it, when known. */
  unlock?: number;
}

/** A loadout published by a named source, kept verbatim with its date. */
export interface Build {
  style: StyleId;
  labelAr: string;
  labelEn: string;
  picks: { slot: SlotId; name: string }[];
  /** Perk ids, one per slot. */
  perks?: string[];
  sourceId: string;
}

export interface Apex {
  name: string;
  doesAr: string;
  doesEn: string;
  /** Slots the Apex attachment takes over. */
  blocks?: SlotId[];
  unlock?: number;
}

export interface Weapon {
  id: string;
  game: GameId;
  class: WeaponClassId;
  name: string;
  ar: string;
  /** Rounds per minute, as published for the base weapon. */
  rpm?: number;
  rounds?: number;
  /** Player level that unlocks the weapon. */
  unlock?: number;
  /** Highest weapon level. */
  maxLevel?: number;
  roleAr: string;
  roleEn: string;
  slots: SlotId[];
  attachments: Attachment[];
  builds: Build[];
  apex?: Apex;
}

export interface Perk extends Named {
  slot: 1 | 2 | 3;
  unlock?: number;
  doesAr: string;
  doesEn: string;
}

export interface Source {
  id: string;
  label: string;
  url: string;
  /** ISO date the page was read. */
  readOn: string;
}

export interface Game {
  id: GameId;
  name: string;
  ar: string;
  short: string;
  year: number;
  emoji: string;
  /** Season or patch the loadout data was gathered from. */
  patch: string;
  /** ISO date the data was last checked against sources. */
  checkedOn: string;
  blurbAr: string;
  blurbEn: string;
  weapons: Weapon[];
  perks: Perk[];
  sources: Source[];
}

/** One recommended slot in a generated class. */
export interface SlotPick {
  slot: SlotId;
  type: AttachmentType;
  /** The exact in-game attachment, when the dataset has one for this weapon. */
  attachment?: Attachment;
  score: number;
}

export interface Recommendation {
  weapon: Weapon;
  style: Style;
  picks: SlotPick[];
  perks: Perk[];
  /** A published build for the same intent, when one exists. */
  build?: Build;
}
