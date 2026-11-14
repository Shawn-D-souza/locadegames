import { lazy, Suspense, useEffect, useState } from "react";
import { isLiveGame, type PartyGameId } from "../../shared/games/catalog";
import { CLOSE_CODES } from "../../shared/protocol/errors";
import type { PlayerId } from "../../shared/rooms/types";
import { currentRound, isLive, isLiveMatch, standings } from "../../shared/tournament/tournament";
import type { Match, Tournament } from "../../shared/tournament/types";
import { stillInParty } from "../../shared/party/party";
import { ArenaRankingTable } from "../components/ArenaRankingTable";
import { PartyRankingTable } from "../components/PartyRankingTable";
import { Modal } from "../components/Modal";
import { PillButton } from "../components/PillButton";
import { StandingsTable } from "../components/StandingsTable";
import { Toast } from "../components/Toast";
import { CLIENT_CONFIG } from "../config";
import { useRoomConnection } from "../hooks/useRoomConnection";
import { useBackButtonGuard } from "../hooks/useBackButtonGuard";
import { useBefore } from "../hooks/useBefore";
import { useRoomSounds } from "../hooks/useRoomSounds";
import { useTimeoutClaims } from "../hooks/useTimeoutClaims";
import { DotsClashScreen } from "../games/dotsclash/DotsClashScreen";
import { LudoScreen } from "../games/ludo/LudoScreen";
import { SnakesLaddersScreen } from "../games/snakesladders/SnakesLaddersScreen";
import { loadHeadCrash } from "../games/headcrash/loadHeadCrash";
import { MATCH_LOOKS } from "../games/matchLooks";
import { loadPool } from "../games/pool/loadPool";
import { loadTerritory } from "../games/territory/loadTerritory";
import { arenaName } from "../utils/arenaText";
import { partyName } from "../utils/partyText";
import { closeMessage, roomErrorMessage } from "../utils/messages";
import { entrantName } from "../utils/tournamentText";
import { JoiningScreen } from "./JoiningScreen";
import { LobbyScreen } from "./LobbyScreen";
import { MatchScreen } from "./MatchScreen";
import { ResultsScreen } from "./ResultsScreen";
import { RoundIntroScreen } from "./RoundIntroScreen";
import { StandingsScreen } from "./StandingsScreen";

interface RoomScreenProps {
  code: string;
  name: string;
  /** Called when the player leaves or the room ends; `message` explains a failure. */
  onExit(message?: string): void;
}

const TerritoryScreen = lazy(() => loadTerritory().then((m) => ({ default: m.TerritoryScreen })));
const HeadCrashScreen = lazy(() => loadHeadCrash().then((m) => ({ default: m.HeadCrashScreen })));
const PoolScreen = lazy(() => loadPool().then((m) => ({ default: m.PoolScreen })));

/** A match within a specific tournament (match ids restart each tournament). */
type MatchRef = { startedAt: number; matchId: number };

const refersTo = (ref: MatchRef | null, t: Tournament, match: Match) =>
  ref !== null && ref.startedAt === t.startedAt && ref.matchId === match.id;

/** Your match this round, if you're in one. */
function myMatch(t: Tournament, myId: PlayerId): Match | undefined {
  return currentRound(t).matches.find((m) => m.players.includes(myId));
}

/** What quitting a real-time match costs. */
const ARENA_QUIT_COST = "You'll be out of this match.";

/** What quitting a game everyone plays together costs. */
const PARTY_QUIT_COST: Record<PartyGameId, string> = {
  dotsclash: "You'll be out of this game. Your dots turn grey.",
  snakesladders: "You'll be out of this game.",
  ludo: "You'll be out of this game. Your pawns leave the board.",
  pool: "You'll be out of this game. Your balls leave the table.",
};

/** What quitting costs: one game with 2 players, the whole tournament with more. */
const quitCost = (t: Tournament) => (t.entrants.length > 2 ? "You'll be out of the tournament." : "You'll lose this game.");

/** Still in the tournament (nobody is knocked out): leaving now forfeits. */
function stillCompeting(t: Tournament, myId: PlayerId): boolean {
  return !t.finished && t.entrants.some((e) => e.id === myId) && !t.left.includes(myId);
}

/** Composes the room's screens (hub, match, standings, champion) with connection feedback. */
export function RoomScreen({ code, name, onExit }: RoomScreenProps) {
  const connection = useRoomConnection(code, name);
  const { status, closeCode, lastError, clearError, room, playerId, clockOffsetMs, send, sendBinary, subscribeBinary, reconnect, leave } =
    connection;
  const [watching, setWatching] = useState<MatchRef | null>(null);
  const [dismissed, setDismissed] = useState<MatchRef | null>(null);
  /** The last own match seen live. Its result still shows when the next round has already started. */
  const [lastPlayed, setLastPlayed] = useState<MatchRef | null>(null);
  /** Asking whether to give up this match (and the rest of the game) but stay in the room. */
  const [confirmQuit, setConfirmQuit] = useState<MatchRef | null>(null);
  const [confirmLeave, setConfirmLeave] = useState(false);
  /** The finished game (its `startedAt`) whose results you left for the room; the others may still be on them. */
  const [leftResults, setLeftResults] = useState<number | null>(null);
  // Real-time match (its `startedAt`): seen live, its ending shown, and whether you are still in it.
  const [arenaSeenLive, setArenaSeenLive] = useState<number | null>(null);
  const [arenaEndSeen, setArenaEndSeen] = useState<number | null>(null);
  const [arenaStillIn, setArenaStillIn] = useState(false);
  const [confirmArenaQuit, setConfirmArenaQuit] = useState<number | null>(null);
  // A game everyone plays together (its `startedAt`): seen live, its ending shown, and quitting it asked.
  const [partySeenLive, setPartySeenLive] = useState<number | null>(null);
  const [partyEndSeen, setPartyEndSeen] = useState<number | null>(null);
  const [confirmPartyQuit, setConfirmPartyQuit] = useState<number | null>(null);
  useTimeoutClaims(room, playerId, clockOffsetMs, send);

  const liveArena = room?.phase === "playing" && room.arena && !room.arena.finished ? room.arena : null;
  if (liveArena && arenaSeenLive !== liveArena.startedAt) setArenaSeenLive(liveArena.startedAt);
  const inLiveArena = !!liveArena && arenaStillIn;
  // Tied to the match it was asked for, so it closes by itself if the match ends first.
  const arenaQuitAsked = inLiveArena && confirmArenaQuit === liveArena.startedAt;

  const liveParty = room?.phase === "playing" && room.party && !room.party.finished ? room.party : null;
  if (liveParty && partySeenLive !== liveParty.startedAt) setPartySeenLive(liveParty.startedAt);
  const inLiveParty = !!liveParty && playerId !== null && stillInParty(liveParty, playerId);
  const partyQuitAsked = inLiveParty && confirmPartyQuit === liveParty.startedAt;

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
  // A real-time game counts its own 3, 2, 1 once the round starts: the intro's countdown and its GO stay quiet.
  const ownCountdown = !!running && isLiveGame(running.gameId);
  useRoomSounds(room, playerId, status, lastError?.id ?? null, beforeRoundStart && !ownCountdown);
  // Your own live match is on screen (not a result still showing first).
  const playingNow =
    !!running && !!liveMine && isLive(liveMine) && !resultPending && !beforeRoundStart && !refersTo(dismissed, running, liveMine);
  const askQuit = () => {
    if (running && liveMine) setConfirmQuit({ startedAt: running.startedAt, matchId: liveMine.id });
  };
  const askArenaQuit = () => {
    if (liveArena) setConfirmArenaQuit(liveArena.startedAt);
  };
  const askPartyQuit = () => {
    if (liveParty) setConfirmPartyQuit(liveParty.startedAt);
  };
  useBackButtonGuard(playingNow || inLiveArena || inLiveParty, inLiveParty ? askPartyQuit : inLiveArena ? askArenaQuit : askQuit);
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
    if ((running && playerId !== null && stillCompeting(running, playerId)) || inLiveArena || inLiveParty) setConfirmLeave(true);
    else leaveNow();
  };
  const quitNow = () => {
    send({ type: "quit" });
    // Straight back to the room view; no result screen for a match you gave up.
    setDismissed(confirmQuit);
    setConfirmQuit(null);
  };
  const quitArenaNow = () => {
    send({ type: "quit" });
    setConfirmArenaQuit(null);
  };
  const quitPartyNow = () => {
    send({ type: "quit" });
    setConfirmPartyQuit(null);
  };

  let content;
  if (!room || playerId === null) {
    content = <JoiningScreen code={code} onBack={leaveNow} />;
  } else if (room.phase === "lobby" || (!room.tournament && !room.arena && !room.party)) {
    content = <LobbyScreen room={room} myId={playerId} send={send} onLeave={requestLeave} />;
  } else if (room.party) {
    const p = room.party;
    // A finished game stays on screen for its ending (if you saw it live), then the results, then the room.
    if (!p.finished || (partySeenLive === p.startedAt && partyEndSeen !== p.startedAt)) {
      const on = { myId: playerId, clockOffsetMs, send, onQuit: askPartyQuit, onLeave: requestLeave, onContinue: () => setPartyEndSeen(p.startedAt) };
      content =
        p.gameId === "dotsclash" ? (
          <DotsClashScreen party={p} {...on} />
        ) : p.gameId === "snakesladders" ? (
          <SnakesLaddersScreen party={p} {...on} />
        ) : p.gameId === "ludo" ? (
          <LudoScreen party={p} {...on} />
        ) : (
          <Suspense fallback={<JoiningScreen code={code} onBack={requestLeave} />}>
            <PoolScreen party={p} {...on} />
          </Suspense>
        );
    } else if (leftResults !== p.startedAt) {
      content = (
        <ResultsScreen
          room={room}
          myId={playerId}
          send={send}
          onBack={() => setLeftResults(p.startedAt)}
          gameId={p.gameId}
          championIds={p.championIds}
          playerCount={p.entrants.length}
          nameOf={(id) => partyName(p, id)}
          tableLabel="Ranking"
        >
          <PartyRankingTable party={p} myId={playerId} />
        </ResultsScreen>
      );
    } else {
      content = <LobbyScreen room={room} myId={playerId} send={send} onLeave={requestLeave} />;
    }
  } else if (room.arena) {
    const a = room.arena;
    // A finished match stays on screen for its ending (if you saw it live), then the results, then the room.
    if (!a.finished || (arenaSeenLive === a.startedAt && arenaEndSeen !== a.startedAt)) {
      content = (
        <Suspense fallback={<JoiningScreen code={code} onBack={requestLeave} />}>
          <TerritoryScreen
          arena={a}
          myId={playerId}
          clockOffsetMs={clockOffsetMs}
          sendBinary={sendBinary}
          subscribeBinary={subscribeBinary}
          onQuit={askArenaQuit}
          onLeave={requestLeave}
          onContinue={() => setArenaEndSeen(a.startedAt)}
          onStillInChange={setArenaStillIn}
          />
        </Suspense>
      );
    } else if (leftResults !== a.startedAt) {
      content = (
        <ResultsScreen
          room={room}
          myId={playerId}
          send={send}
          onBack={() => setLeftResults(a.startedAt)}
          gameId={a.gameId}
          championIds={a.championIds}
          playerCount={a.entrants.length}
          nameOf={(id) => arenaName(a, id)}
          tableLabel="Ranking"
        >
          <ArenaRankingTable arena={a} myId={playerId} />
        </ResultsScreen>
      );
    } else {
      content = <LobbyScreen room={room} myId={playerId} send={send} onLeave={requestLeave} />;
    }
  } else if (room.tournament) {
    // The last match stays on screen when the tournament ends, so everyone sees how it finished;
    // after its result it moves on to the champion screen.
    const t = room.tournament;
    const finished = room.phase === "finished";
    const mine = myMatch(t, playerId);
    const allMatches = t.rounds.flatMap((r) => r.matches);
    const watched = allMatches.find((m) => refersTo(watching, t, m));
    // When a round's last match ends, the server starts the next round at once; hold the result first.
    const justPlayed = allMatches.find((m) => refersTo(lastPlayed, t, m) && !isLive(m) && !refersTo(dismissed, t, m));
    const close = () => setWatching(null);
    /** A match on screen: a turn-based game's board, or a real-time game's own screen (a fresh one per match). */
    const matchScreen = (match: Match, on: { onBack?: () => void; onContinue?: () => void; onQuit?: () => void }) =>
      isLiveMatch(match) ? (
        <Suspense fallback={<JoiningScreen code={code} onBack={requestLeave} />}>
          <HeadCrashScreen
            key={`${t.startedAt}:${match.id}`}
            tournament={t}
            match={match}
            myId={playerId}
            clockOffsetMs={clockOffsetMs}
            sendBinary={sendBinary}
            subscribeBinary={subscribeBinary}
            {...on}
          />
        </Suspense>
      ) : isLiveGame(t.gameId) ? null : (
        <MatchScreen room={room} tournament={t} gameId={t.gameId} match={match} myId={playerId} clockOffsetMs={clockOffsetMs} send={send} {...on} />
      );
    if (justPlayed) {
      content = matchScreen(justPlayed, { onContinue: () => setDismissed({ startedAt: t.startedAt, matchId: justPlayed.id }) });
    } else if (watched && !isLive(watched)) {
      // Same for a match you were watching: its ending shows before anything else.
      content = matchScreen(watched, { onContinue: close });
    } else if (beforeRoundStart) {
      content = (
        <RoundIntroScreen
          room={room}
          tournament={t}
          myId={playerId}
          startsAt={roundStart}
          live={ownCountdown}
          pieces={!isLiveGame(t.gameId) && MATCH_LOOKS[t.gameId].pieces}
        />
      );
    } else if (mine && !refersTo(dismissed, t, mine)) {
      content = matchScreen(mine, {
        onContinue: !isLive(mine) ? () => setDismissed({ startedAt: t.startedAt, matchId: mine.id }) : undefined,
        onQuit: askQuit,
      });
    } else if (watched) {
      // BACK TO SCORES while it's live; once it ends it moves on by itself like your own match.
      content = matchScreen(watched, { onBack: close, onContinue: close });
    } else if (finished && leftResults !== t.startedAt) {
      content = (
        <ResultsScreen
          room={room}
          myId={playerId}
          send={send}
          onBack={() => setLeftResults(t.startedAt)}
          gameId={t.gameId}
          championIds={t.championIds}
          playerCount={t.entrants.length}
          nameOf={(id) => entrantName(t, id)}
          tableLabel="Points"
        >
          <StandingsTable standings={standings(t)} myId={playerId} />
        </ResultsScreen>
      );
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
          serious
          title="Quit this game?"
          actions={
            <div className="flex w-full flex-col gap-4">
              <PillButton fullWidth variant="deep" onClick={quitNow}>
                QUIT
              </PillButton>
              <PillButton fullWidth sound="popupClose" onClick={() => setConfirmQuit(null)}>
                KEEP PLAYING
              </PillButton>
            </div>
          }
        >
          <p className="text-center">{quitCost(running)}</p>
        </Modal>
      )}
      {arenaQuitAsked && (
        <Modal
          serious
          title="Quit this game?"
          actions={
            <div className="flex w-full flex-col gap-4">
              <PillButton fullWidth variant="deep" onClick={quitArenaNow}>
                QUIT
              </PillButton>
              <PillButton fullWidth sound="popupClose" onClick={() => setConfirmArenaQuit(null)}>
                KEEP PLAYING
              </PillButton>
            </div>
          }
        >
          <p className="text-center">{ARENA_QUIT_COST}</p>
        </Modal>
      )}
      {partyQuitAsked && (
        <Modal
          serious
          title="Quit this game?"
          actions={
            <div className="flex w-full flex-col gap-4">
              <PillButton fullWidth variant="deep" onClick={quitPartyNow}>
                QUIT
              </PillButton>
              <PillButton fullWidth sound="popupClose" onClick={() => setConfirmPartyQuit(null)}>
                KEEP PLAYING
              </PillButton>
            </div>
          }
        >
          <p className="text-center">{liveParty && PARTY_QUIT_COST[liveParty.gameId]}</p>
        </Modal>
      )}
      {confirmLeave && (running || inLiveArena || inLiveParty) && (
        <Modal
          serious
          title="Leave the room?"
          actions={
            <div className="flex w-full flex-col gap-4">
              <PillButton fullWidth variant="deep" onClick={leaveNow}>
                LEAVE
              </PillButton>
              <PillButton fullWidth sound="popupClose" onClick={() => setConfirmLeave(false)}>
                STAY
              </PillButton>
            </div>
          }
        >
          <p className="text-center">{running ? quitCost(running) : inLiveParty ? PARTY_QUIT_COST[liveParty.gameId] : ARENA_QUIT_COST}</p>
        </Modal>
      )}
      {status === "lost" && (
        <Modal
          serious
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
