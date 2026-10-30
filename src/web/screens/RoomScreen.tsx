import { useEffect, useState } from "react";
import { CLOSE_CODES } from "../../shared/protocol/errors";
import type { PlayerId } from "../../shared/rooms/types";
import { currentRound, isLive } from "../../shared/tournament/tournament";
import type { Match, Tournament } from "../../shared/tournament/types";
import { Modal } from "../components/Modal";
import { PillButton } from "../components/PillButton";
import { Toast } from "../components/Toast";
import { CLIENT_CONFIG } from "../config";
import { useRoomConnection } from "../hooks/useRoomConnection";
import { useBackButtonGuard } from "../hooks/useBackButtonGuard";
import { useBefore } from "../hooks/useBefore";
import { useTimeoutClaims } from "../hooks/useTimeoutClaims";
import { closeMessage, roomErrorMessage } from "../utils/messages";
import { ChampionScreen } from "./ChampionScreen";
import { JoiningScreen } from "./JoiningScreen";
import { LobbyScreen } from "./LobbyScreen";
import { MatchScreen } from "./MatchScreen";
import { RoundIntroScreen } from "./RoundIntroScreen";
import { StandingsScreen } from "./StandingsScreen";

interface RoomScreenProps {
  code: string;
  name: string;
  /** Called when the player leaves or the room ends; `message` explains a failure. */
  onExit(message?: string): void;
}

/** A match within a specific tournament (match ids restart each tournament). */
type MatchRef = { startedAt: number; matchId: number };

const refersTo = (ref: MatchRef | null, t: Tournament, match: Match) =>
  ref !== null && ref.startedAt === t.startedAt && ref.matchId === match.id;

/** Your match this round, if you're in one. */
function myMatch(t: Tournament, myId: PlayerId): Match | undefined {
  return currentRound(t).matches.find((m) => m.players.includes(myId));
}

/** What quitting costs: one game with 2 players, the whole tournament with more. */
const quitCost = (t: Tournament) => (t.entrants.length > 2 ? "You'll be out of the tournament." : "You'll lose this game.");

/** Still in the tournament (nobody is knocked out): leaving now forfeits. */
function stillCompeting(t: Tournament, myId: PlayerId): boolean {
  return !t.finished && t.entrants.some((e) => e.id === myId) && !t.left.includes(myId);
}

/** Composes the room's screens (hub, match, standings, champion) with connection feedback. */
export function RoomScreen({ code, name, onExit }: RoomScreenProps) {
  const connection = useRoomConnection(code, name);
  const { status, closeCode, lastError, clearError, room, playerId, clockOffsetMs, send, reconnect, leave } = connection;
  const [watching, setWatching] = useState<MatchRef | null>(null);
  const [dismissed, setDismissed] = useState<MatchRef | null>(null);
  /** The last own match seen live. Its result still shows when the next round has already started. */
  const [lastPlayed, setLastPlayed] = useState<MatchRef | null>(null);
  /** Asking whether to give up this match (and the rest of the game) but stay in the room. */
  const [confirmQuit, setConfirmQuit] = useState<MatchRef | null>(null);
  const [confirmLeave, setConfirmLeave] = useState(false);
  /** The finished game (its `startedAt`) whose results you left for the room; the others may still be on them. */
  const [leftResults, setLeftResults] = useState<number | null>(null);
  useTimeoutClaims(room, playerId, clockOffsetMs, send);

  // Your own live match on screen: the ✕ and the back button both ask before quitting.
  const running = room?.phase === "playing" ? room.tournament : null;
  const liveMine = running && playerId !== null ? myMatch(running, playerId) : undefined;
  // Move on to the new match only once the previous one's result has been shown (dismissed);
  // otherwise the next round, which starts in the same update, would skip it.
  const previous = running?.rounds.flatMap((r) => r.matches).find((m) => refersTo(lastPlayed, running, m));
  const resultPending = !!running && !!previous && !isLive(previous) && !refersTo(dismissed, running, previous);
  if (running && liveMine && isLive(liveMine) && !resultPending && !refersTo(lastPlayed, running, liveMine)) {
    setLastPlayed({ startedAt: running.startedAt, matchId: liveMine.id });
  }
  // Rounds after the first share one start time (server clock); until then everyone sees the round intro.
  const roundKey = running && running.rounds.length > 1 ? `${running.startedAt}:${running.rounds.length}` : null;
  const roundStart = running ? currentRound(running).startsAt - clockOffsetMs : 0;
  const beforeRoundStart = useBefore(roundKey, roundStart);
  // Your own live match is on screen (not a result still showing first).
  const playingNow =
    !!running && !!liveMine && isLive(liveMine) && !resultPending && !beforeRoundStart && !refersTo(dismissed, running, liveMine);
  const askQuit = () => {
    if (running && liveMine) setConfirmQuit({ startedAt: running.startedAt, matchId: liveMine.id });
  };
  useBackButtonGuard(playingNow, askQuit);
  // Tied to the match it was asked for, so it closes by itself if that match ends first.
  const quitAsked = playingNow && refersTo(confirmQuit, running!, liveMine!);

  useEffect(() => {
    if (status !== "ended" || closeCode === null) return;
    onExit(closeCode === CLOSE_CODES.left ? undefined : closeMessage(closeCode));
  }, [status, closeCode, onExit]);

  useEffect(() => {
    if (!lastError) return;
    const timer = setTimeout(clearError, CLIENT_CONFIG.toastDurationMs);
    return () => clearTimeout(timer);
  }, [lastError, clearError]);

  const leaveNow = () => {
    leave();
    onExit();
  };
  const requestLeave = () => {
    if (running && playerId !== null && stillCompeting(running, playerId)) setConfirmLeave(true);
    else leaveNow();
  };
  const quitNow = () => {
    send({ type: "quit" });
    // Straight back to the room view; no result screen for a match you gave up.
    setDismissed(confirmQuit);
    setConfirmQuit(null);
  };

  let content;
  if (!room || playerId === null) {
    content = <JoiningScreen code={code} onBack={leaveNow} />;
  } else if (room.phase === "lobby" || !room.tournament) {
    content = <LobbyScreen room={room} myId={playerId} send={send} onLeave={requestLeave} />;
  } else {
    // The last match stays on screen when the tournament ends, so everyone sees how it finished;
    // after its result it moves on to the champion screen.
    const t = room.tournament;
    const finished = room.phase === "finished";
    const mine = myMatch(t, playerId);
    const allMatches = t.rounds.flatMap((r) => r.matches);
    const watched = allMatches.find((m) => refersTo(watching, t, m));
    // When a round's last match ends, the server starts the next round at once; hold the result first.
    const justPlayed = allMatches.find((m) => refersTo(lastPlayed, t, m) && !isLive(m) && !refersTo(dismissed, t, m));
    const matchProps = { room, tournament: t, myId: playerId, clockOffsetMs, send };
    const close = () => setWatching(null);
    if (justPlayed) {
      content = (
        <MatchScreen
          {...matchProps}
          match={justPlayed}
          onContinue={() => setDismissed({ startedAt: t.startedAt, matchId: justPlayed.id })}
        />
      );
    } else if (watched && !isLive(watched)) {
      // Same for a match you were watching: its ending shows before anything else.
      content = <MatchScreen {...matchProps} match={watched} onContinue={close} />;
    } else if (beforeRoundStart) {
      content = <RoundIntroScreen room={room} tournament={t} myId={playerId} startsAt={roundStart} />;
    } else if (mine && !refersTo(dismissed, t, mine)) {
      content = (
        <MatchScreen
          {...matchProps}
          match={mine}
          onContinue={!isLive(mine) ? () => setDismissed({ startedAt: t.startedAt, matchId: mine.id }) : undefined}
          onQuit={askQuit}
        />
      );
    } else if (watched) {
      // BACK TO SCORES while it's live; once it ends it moves on by itself like your own match.
      content = <MatchScreen {...matchProps} match={watched} onBack={close} onContinue={close} />;
    } else if (finished && leftResults !== t.startedAt) {
      content = <ChampionScreen room={room} tournament={t} myId={playerId} send={send} onBack={() => setLeftResults(t.startedAt)} />;
    } else if (finished) {
      // Back in the room while the room still holds the results; the host can start the next game from here.
      content = <LobbyScreen room={room} myId={playerId} send={send} onLeave={requestLeave} />;
    } else {
      content = (
        <StandingsScreen
          tournament={t}
          myId={playerId}
          onWatch={(matchId) => setWatching({ startedAt: t.startedAt, matchId })}
          onLeave={requestLeave}
        />
      );
    }
  }

  return (
    <>
      {content}
      {status === "reconnecting" && <Toast message="RECONNECTING..." />}
      {lastError && status !== "reconnecting" && <Toast key={lastError.id} message={roomErrorMessage(lastError.error)} />}
      {quitAsked && running && (
        <Modal
          title="Quit this game?"
          actions={
            <div className="flex w-full flex-col gap-4">
              <PillButton fullWidth variant="deep" onClick={quitNow}>
                QUIT
              </PillButton>
              <PillButton fullWidth onClick={() => setConfirmQuit(null)}>
                KEEP PLAYING
              </PillButton>
            </div>
          }
        >
          <p className="text-center">{quitCost(running)}</p>
        </Modal>
      )}
      {confirmLeave && running && (
        <Modal
          title="Leave the room?"
          actions={
            <div className="flex w-full flex-col gap-4">
              <PillButton fullWidth variant="deep" onClick={leaveNow}>
                LEAVE
              </PillButton>
              <PillButton fullWidth onClick={() => setConfirmLeave(false)}>
                STAY
              </PillButton>
            </div>
          }
        >
          <p className="text-center">{quitCost(running)}</p>
        </Modal>
      )}
      {status === "lost" && (
        <Modal
          title="Connection lost"
          actions={
            <div className="flex w-full flex-col gap-4">
              <PillButton fullWidth onClick={reconnect}>
                RECONNECT
              </PillButton>
              <PillButton fullWidth variant="deep" onClick={() => onExit()}>
                HOME
              </PillButton>
            </div>
          }
        >
          <p className="text-center">Check your internet and try again.</p>
        </Modal>
      )}
    </>
  );
}
