import { useCurrentFrame, useVideoConfig } from "remotion";
import { playPartyMove, startParty, turnPlayer } from "../../../../src/shared/party/party";
import type { Party, PartyEntrant } from "../../../../src/shared/party/types";
import type { PartyGameId } from "../../../../src/shared/games/catalog";
import { videoMs } from "../../clock/clock";
import type { PlayerId } from "../../../../src/shared/rooms/types";
import { FRIENDS } from "../../cast";
import { CLIPS, type ClipName } from "../clips";

/** The four friends as a game's players, in join order. */
export const PLAYERS = FRIENDS.map((name, id) => ({ id: id as PlayerId, name, firsts: 0 }));

/** A game's turn order made the friends' join order (Ana first), whatever the coin said: the video's games are scripted. */
export function inJoinOrder<P extends { entrants: PartyEntrant[] }>(party: P): P {
  return { ...party, entrants: [...party.entrants].sort((a, b) => a.id - b.id) };
}

/** Where a clip is in the video (seconds from 0:00). */
export function useClipSeconds(clip: ClipName): number {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return (CLIPS[clip].from + frame) / fps;
}

/** The latest of a game's scripted states by `t` (seconds): each one is what the server would have sent then. */
export function stateAt<S>(t: number, script: readonly { at: number; state: S }[]): S {
  let shown = script[0]!.state;
  for (const step of script) if (t >= step.at) shown = step.state;
  return shown;
}

/** A scripted move must be a legal one. */
export function ok<T>(update: { ok: true; party: T } | { ok: false; error: string }): T {
  if (!update.ok) throw new Error(`A scripted move was refused: ${update.error}`);
  return update.party;
}

/** A scripted party game: each move [raw move, when (s)] played by whoever's turn it is, with dice and cards loaded as a playtest's (a dev server's). */
export function scriptParty<G extends PartyGameId>(gameId: G, moves: readonly (readonly [unknown, number])[], seed = 1): { at: number; state: Party<G> }[] {
  let party = inJoinOrder(startParty(gameId, PLAYERS, videoMs((moves[0]?.[1] ?? 0) - 2), seed) as Party);
  const script = [{ at: 0, state: party }];
  for (const [move, at] of moves) {
    party = ok(playPartyMove(party, turnPlayer(party)!, move, videoMs(at), 7, true));
    script.push({ at, state: party });
  }
  return script as { at: number; state: Party<G> }[];
}

/** Moves `count` long, the last at `last` (s), the others `gap` seconds apart before it. */
export const spacedBefore = (count: number, last: number, gap: number) => (i: number) => last - (count - 1 - i) * gap;
