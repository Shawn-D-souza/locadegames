import { shipCells, shipLength } from "../../../shared/games/seabattle/fleet";
import { MARK, type SeaBattleState } from "../../../shared/games/seabattle/types";
import type { Seat } from "../../../shared/games/types";
import type { HapticName } from "../../haptics/hapticBook";
import type { SoundName } from "../../sound/soundBook";

/** What a cannonball did where it landed: a splash, a hit, or the hit that sank a ship. */
export type ImpactKind = "miss" | "hit" | "sunk";

/** Someone else's shot sits back a little; watching, a little more. */
const OTHERS_VOLUME = 0.8;
const WATCHING_VOLUME = 0.65;

/** The next cannon coming in plays every time the turn passes: it sits back under everything else. */
export const CANNON_READY_VOLUME = 0.75;

/** What a shot at `seat`'s waters did, as the game now has it: a splash, a hit, or the hit that sank a ship. */
export function shotResult(game: SeaBattleState, seat: Seat, cell: number): ImpactKind {
  if (game.marks[seat][cell] !== MARK.hit) return "miss";
  return game.wrecks[seat].some((w) => shipCells(w, shipLength(w.index))?.includes(cell)) ? "sunk" : "hit";
}

/** How loud something `shooter` did is for `viewer` (your seat, or null watching). */
export const shotVolume = (shooter: Seat, viewer: Seat | null) => (viewer === null ? WATCHING_VOLUME : shooter === viewer ? 1 : OTHERS_VOLUME);

/**
 * A cannonball landing, for whoever is looking: anyone's splash; a hit nearer and heavier when it's your own ship,
 * from further off watching. Your ships' news is yours, so it's full volume. A sinking sounds like a hit (owner
 * decision 2026-11-13: no sinking sound fitted; the big blast and the wreck slamming down on screen carry it), but it
 * feels like one, landing twice as the wreck does (`feel`, played with the sound and taking over from the hit's).
 */
export function landingCue(kind: ImpactKind, shooter: Seat, viewer: Seat | null): { sound: SoundName; volume: number; feel: HapticName | null } {
  if (kind === "miss") return { sound: "seaBattleSplash", volume: shotVolume(shooter, viewer), feel: null };
  if (viewer === null) return { sound: "seaBattleHit", volume: WATCHING_VOLUME, feel: null };
  const yours = shooter === viewer;
  const feel = kind === "sunk" ? (yours ? "seaBattleYouSank" : "seaBattleYourShipSank") : null;
  return { sound: yours ? "seaBattleYouHit" : "seaBattleYourShipHit", volume: 1, feel };
}

/** The last shot's landing as the ending plays it (the ending's own sounds say who won, so the watchers' one). */
export function lastMarkSound(game: SeaBattleState): { sound: SoundName; variant: number } | null {
  const shot = game.lastShot;
  if (shot === null) return null;
  const kind = shotResult(game, shot.seat === 0 ? 1 : 0, shot.cell);
  return { sound: kind === "miss" ? "seaBattleSplash" : "seaBattleHit", variant: 0 };
}
