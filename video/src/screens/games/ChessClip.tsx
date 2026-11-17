import { MatchScreen } from "../../../../src/web/screens/MatchScreen";
import { CHESS_LOOK } from "../../../../src/web/games/chess/look";
import type { MatchLook } from "../../../../src/web/games/matchLook";
import type { GameState } from "../../../../src/shared/games/registry";
import { findActiveMatch, playMove, startTournament } from "../../../../src/shared/tournament/tournament";
import type { Tournament, TurnMatch } from "../../../../src/shared/tournament/types";
import type { PlayerId } from "../../../../src/shared/rooms/types";
import { durations } from "../../../../src/theme/motion";
import { AppScreen } from "../../parts/AppScreen";
import { useVideoClock } from "../../clock/useVideoClock";
import { videoMs } from "../../clock/clock";
import { FRIENDS, roomWith } from "../../cast";
import { cueSeconds } from "../../timing";
import { CLIPS } from "../clips";
import { stateAt, useClipSeconds } from "./script";

/**
 * Chess, Ana (white) against Leo in the room's tournament, on Ana's phone: the quickest checkmate there is (the
 * scholar's mate), her queen taking f7 on the beat, then the app's win. Squares count from the top left (a8) row by row.
 */
const MOVES: [number, number][] = [
  [52, 36], // e4
  [12, 28], // e5
  [61, 34], // Bc4
  [1, 18], // Nc6
  [59, 31], // Qh5
  [6, 21], // Nf6??
  [31, 13], // Qxf7#
];
/** The coin that makes Ana white (who starts is the coin's, as in the app). */
const COIN = 4;
/** The queen lands on f7 on the beat (sent a slide earlier); the app's win bursts about a second later, on the next beat but one. */
const MATE = cueSeconds("chess") + 0.5 - durations.chessSlide / 1000;

const ana = 0 as PlayerId;
const players = FRIENDS.map((name, id) => ({ id: id as PlayerId, name, trophies: 0, joinOrder: id }));
// The earlier moves some seconds apart (longer than the clock's 5 s a move, so the clocks run down), Leo's reply just before the shot.
const moveAt = (i: number) => (i === MOVES.length - 1 ? MATE : MATE - 1.2 - (MOVES.length - 2 - i) * 9);
let t: Tournament = startTournament("chess", players, videoMs(moveAt(0) - 4), COIN);
const SCRIPT: { at: number; state: Tournament }[] = [{ at: 0, state: t }];
MOVES.forEach(([from, to], i) => {
  const match = findActiveMatch(t, ana)!;
  const update = playMove(t, match.players[i % 2]!, { from, to }, videoMs(moveAt(i)));
  if (!update.ok) throw new Error(`A scripted chess move was refused: ${update.error}`);
  t = update.tournament;
  SCRIPT.push({ at: moveAt(i), state: t });
});
const matchOf = (tournament: Tournament) => tournament.rounds[0]!.matches.find((m) => m.players.includes(ana)) as TurnMatch;
const look = CHESS_LOOK as unknown as MatchLook<GameState>;

/** Chess on Ana's phone held sideways, through her checkmate and the win. */
export function ChessClip() {
  useVideoClock(CLIPS.chess.from);
  const tournament = stateAt(useClipSeconds("chess"), SCRIPT);
  const room = { ...roomWith(4), phase: "playing" as const, tournament };
  return (
    <AppScreen>
      <MatchScreen room={room} tournament={tournament} look={look} match={matchOf(tournament)} myId={ana} clockOffsetMs={0} send={() => {}} onQuit={() => {}} onContinue={() => {}} />
    </AppScreen>
  );
}
