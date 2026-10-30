import { useEffect } from "react";
import type { ClientMessage, RoomView } from "../../shared/protocol/messages";
import type { PlayerId } from "../../shared/rooms/types";
import { currentRound, isLive, turnDeadline } from "../../shared/tournament/tournament";
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
  // One key per live turn, so timers reset exactly when a move lands.
  const claims =
    t && !t.finished && myId !== null
      ? currentRound(t)
          .matches.filter(isLive)
          .filter((m) => {
            const inMatch = m.players.includes(myId);
            const away = m.players.every((id) => !room!.players.find((p) => p.id === id)?.connected);
            return inMatch || away;
          })
          .map((m) => ({ matchId: m.id, deadline: turnDeadline(t, m) - clockOffsetMs }))
      : [];
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
