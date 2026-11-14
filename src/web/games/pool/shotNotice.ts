import { onTheBlack } from "../../../shared/games/pool/rules";
import { POOL_CONFIG } from "../../../shared/games/pool/config";
import type { PoolState, PoolTimeout } from "../../../shared/games/pool/types";
import type { Party } from "../../../shared/party/types";
import type { PlayerId } from "../../../shared/rooms/types";

const FOULS = {
  scratch: { mine: "SCRATCH! TURN OVER", theirs: "SCRATCHED" },
  noHit: { mine: "NO BALL HIT! TURN OVER", theirs: "HIT NOTHING" },
  wrongBall: { mine: "WRONG BALL FIRST! TURN OVER", theirs: "HIT THE WRONG BALL FIRST" },
} as const;

/** What the last shot (or timeout) tells everyone once it has played out, as a short notice at the top; null if nothing worth it. */
export function shotNotice(party: Party<"pool">, game: PoolState, myId: PlayerId): string | null {
  const last = game.last;
  if (!last) return null;
  const name = party.entrants[last.seat]!.name.toUpperCase();
  const mine = party.entrants[last.seat]!.id === myId;
  if (last.kind === "timeout") return timeoutNotice(last, mine, name);
  if (last.won) return null;
  if (last.out) return mine ? "THE BLACK, TOO EARLY! YOU'RE OUT" : `${name} SANK THE BLACK: OUT!`;
  if (last.foul) return mine ? FOULS[last.foul].mine : `${name} ${FOULS[last.foul].theirs}`;
  // The shot cleared the last of their balls: the black is next.
  const hadSome = last.before.some((b) => b.on && b.owner === last.seat);
  if (hadSome && onTheBlack(game, last.seat)) return mine ? "ALL IN! NOW THE BLACK" : `${name} IS ON THE BLACK`;
  return null;
}

/** A turn run out: the turn passes; the last one but one warns you; one too many puts you out. */
function timeoutNotice(last: PoolTimeout, mine: boolean, name: string): string {
  if (last.out) return mine ? `${POOL_CONFIG.missedTurnsOut} TURNS MISSED! YOU'RE OUT` : `${name} MISSED ${POOL_CONFIG.missedTurnsOut} TURNS: OUT!`;
  if (mine && last.missed === POOL_CONFIG.missedTurnsOut - 1) return "OUT OF TIME! ONE MORE: YOU'RE OUT";
  return mine ? "OUT OF TIME! TURN OVER" : `${name} RAN OUT OF TIME`;
}
