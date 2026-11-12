import { useEffect } from "react";
import type { ClientMessage, RoomView } from "../../shared/protocol/messages";
import { isLiveGame } from "../../shared/games/catalog";
import type { PlayerId } from "../../shared/rooms/types";
import { currentRound, isLive, turnDeadline } from "../../shared/tournament/tournament";
import { partyDeadline, picking, turnPlayer } from "../../shared/party/party";
import { CLIENT_CONFIG } from "../config";

/**
 * The server has no timers (so it can sleep between turns). When a turn runs out,
 * clients ask it to play the auto move: the two players in the match, or, if both
 * are away, everyone watching. The server checks its own clock.
 */
export function useTimeoutClaims(
  room: RoomView | null,
  myId: PlayerId | null,
  clockOffsetMs: number,
  send: (message: ClientMessage) => void,
) {
  const t = room?.phase === "playing" ? room.tournament : null;
  // One key per live turn, so timers reset exactly when a move lands. (A real-time game has no turns to run out.)
  const claims =
    t && !t.finished && myId !== null && !isLiveGame(t.gameId)
      ? currentRound(t)
          .matches.filter(isLive)
          .filter((m) => {
            const inMatch = m.players.includes(myId);
            const away = m.players.every((id) => !room!.players.find((p) => p.id === id)?.connected);
            return inMatch || away;
          })
          .map((m) => ({ matchId: m.id, deadline: turnDeadline(t, m) - clockOffsetMs }))
      : [];
  // A game everyone plays together: whoever's turn it is claims, or everyone if they're away; while everyone picks at
  // once, everyone claims. Its turn number names the claim.
  const party = room?.phase === "playing" ? room.party : null;
  const turnId = party ? turnPlayer(party) : null;
  if (party && myId !== null && (picking(party) || turnId !== null)) {
    const away = turnId !== null && !room!.players.find((p) => p.id === turnId)?.connected;
    if (picking(party) || turnId === myId || away) claims.push({ matchId: party.game.moves, deadline: partyDeadline(party) - clockOffsetMs });
  }
  const key = claims.map((c) => `${c.matchId}@${c.deadline}`).join(",");

  useEffect(() => {
    if (!key) return;
    const timers: ReturnType<typeof setTimeout>[] = [];
    for (const part of key.split(",")) {
      const [matchId, deadline] = part.split("@").map(Number) as [number, number];
      const claim = () => {
        send({ type: "timeout", matchId });
        timers.push(setTimeout(claim, CLIENT_CONFIG.timeoutClaimRetryMs));
      };
      timers.push(setTimeout(claim, Math.max(0, deadline + CLIENT_CONFIG.timeoutClaimGraceMs - Date.now())));
    }
    return () => timers.forEach(clearTimeout);
  }, [key, send]);
}
