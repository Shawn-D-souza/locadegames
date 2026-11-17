import { MatchScreen } from "../../../../src/web/screens/MatchScreen";
import type { MatchLook } from "../../../../src/web/games/matchLook";
import { MATCH_GAMES, type GameState } from "../../../../src/shared/games/registry";
import type { TurnGameId } from "../../../../src/shared/games/catalog";
import { findActiveMatch, playMove, startTournament, tournamentView } from "../../../../src/shared/tournament/tournament";
import type { Tournament, TurnMatch } from "../../../../src/shared/tournament/types";
import type { PlayerId } from "../../../../src/shared/rooms/types";
import { AppScreen } from "../../parts/AppScreen";
import { useVideoClock } from "../../clock/useVideoClock";
import { videoMs } from "../../clock/clock";
import { FRIENDS, roomWith } from "../../cast";
import { CLIPS, type ClipName } from "../clips";
import { stateAt, useClipSeconds } from "./script";

/**
 * A 1v1 game in the room's tournament, on Ana's phone: Ana against Leo (the tournament's first round pairs the best seed
 * with the weakest), Ana starting (the coin's, as in the app).
 */
export const ANA = 0 as PlayerId;
const COIN = 4;
const SEEDS = FRIENDS.map((name, id) => ({ id: id as PlayerId, name, trophies: 0, joinOrder: id }));

/** A scripted match: each move [raw move, when (s)], played by whoever's turn it is (or `seat`, while both act: placing a fleet). */
export function scriptMatch(gameId: TurnGameId, moves: readonly (readonly [unknown, number, number?])[]): { at: number; state: Tournament }[] {
  let t = startTournament(gameId, SEEDS, videoMs((moves[0]?.[1] ?? 0) - 2), COIN);
  const script = [{ at: 0, state: t }];
  for (const [move, at, seat] of moves) {
    const match = findActiveMatch(t, ANA) as TurnMatch;
    const mover = match.players[seat ?? MATCH_GAMES[gameId].turn(match.game as never)!]!;
    const update = playMove(t, mover, move, videoMs(at));
    if (!update.ok) throw new Error(`A scripted ${gameId} move was refused: ${update.error}`);
    t = update.tournament;
    script.push({ at, state: t });
  }
  if (findActiveMatch(t, ANA)?.players[0] !== ANA && t.rounds[0]!.matches.find((m) => m.players.includes(ANA))!.players[0] !== ANA) throw new Error("Ana must start");
  return script;
}

/** A match from its script on Ana's phone held sideways, as her phone would show it (another's secrets hidden). */
export function MatchClip({ clip, script, look }: { clip: ClipName; script: { at: number; state: Tournament }[]; look: MatchLook<never> }) {
  useVideoClock(CLIPS[clip].from);
  const tournament = tournamentView(stateAt(useClipSeconds(clip), script), ANA);
  const room = { ...roomWith(4), phase: "playing" as const, tournament };
  const match = tournament.rounds[0]!.matches.find((m) => m.players.includes(ANA)) as TurnMatch;
  return (
    <AppScreen>
      <MatchScreen room={room} tournament={tournament} look={look as unknown as MatchLook<GameState>} match={match} myId={ANA} clockOffsetMs={0} send={() => {}} onQuit={() => {}} onContinue={() => {}} />
    </AppScreen>
  );
}
