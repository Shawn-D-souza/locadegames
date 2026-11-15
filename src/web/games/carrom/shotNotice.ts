import { CARROM_CONFIG } from "../../../shared/games/carrom/config";
import type { CarromState, CarromTimeout } from "../../../shared/games/carrom/types";
import type { Party } from "../../../shared/party/types";
import type { PlayerId } from "../../../shared/rooms/types";

/** Points with their sign: +30, -10. */
export const signed = (points: number) => (points > 0 ? `+${points}` : `${points}`);

/** What the last shot (or timeout) tells everyone once it has played out, as a short notice; null if nothing worth it. */
export function shotNotice(party: Party<"carrom">, game: CarromState, myId: PlayerId): string | null {
  const last = game.last;
  if (!last) return null;
  const name = party.entrants[last.seat]!.name.toUpperCase();
  const mine = party.entrants[last.seat]!.id === myId;
  if (last.kind === "timeout") return timeoutNotice(last, mine, name);
  const { foulPenalty, points } = CARROM_CONFIG;
  if (last.foul) {
    const queen = last.queen === "returned" ? " · QUEEN BACK" : "";
    return mine ? `STRIKER IN! -${foulPenalty}${queen}` : `${name} POCKETED THE STRIKER: -${foulPenalty}${queen}`;
  }
  if (last.queen === "covered") return mine ? `QUEEN COVERED! ${signed(last.points)}` : `${name} COVERED THE QUEEN: ${signed(last.points)}`;
  if (last.queen === "returned") return mine ? "NOT COVERED! THE QUEEN GOES BACK" : `${name} DIDN'T COVER THE QUEEN`;
  if (last.queen === "pocketed") {
    const with_ = last.points > 0 ? ` ${signed(last.points)}` : "";
    return mine ? `THE QUEEN!${with_} NOW COVER HER` : `${name} POCKETED THE QUEEN (${points.queen} IF COVERED)`;
  }
  if (last.points > 0) return mine ? `${signed(last.points)}!` : `${name} ${signed(last.points)}`;
  return null;
}

/** A turn run out: the turn passes; the last one but one warns you; one too many puts you out. */
function timeoutNotice(last: CarromTimeout, mine: boolean, name: string): string {
  const { missedTurnsOut } = CARROM_CONFIG;
  if (last.out) return mine ? `${missedTurnsOut} TURNS MISSED! YOU'RE OUT` : `${name} MISSED ${missedTurnsOut} TURNS: OUT!`;
  const queen = last.queenReturned ? " · QUEEN BACK" : "";
  if (mine && last.missed === missedTurnsOut - 1) return `OUT OF TIME! ONE MORE: YOU'RE OUT${queen}`;
  return mine ? `OUT OF TIME! TURN OVER${queen}` : `${name} RAN OUT OF TIME${queen}`;
}
