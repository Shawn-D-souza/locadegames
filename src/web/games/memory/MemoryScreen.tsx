import { clsx } from "clsx";
import { useCallback, useEffect, useState, type CSSProperties } from "react";
import { MEMORY_CONFIG } from "../../../shared/games/memory/config";
import { canTurn, isIn, pairsOf } from "../../../shared/games/memory/rules";
import type { MemoryFace } from "../../../shared/games/memory/types";
import { partyDeadline } from "../../../shared/party/party";
import type { Party } from "../../../shared/party/types";
import type { RoomError } from "../../../shared/protocol/errors";
import type { ClientMessage } from "../../../shared/protocol/messages";
import type { PlayerId } from "../../../shared/rooms/types";
import { Badge } from "../../components/Badge";
import { Header } from "../../components/Header";
import { IconButton } from "../../components/IconButton";
import { ScreenLayout } from "../../components/ScreenLayout";
import { SunRays } from "../../components/SunRays";
import { Toast } from "../../components/Toast";
import { TurnBanner } from "../../components/TurnBanner";
import { TurnStrip } from "../../components/TurnStrip";
import { CLIENT_CONFIG } from "../../config";
import { useAutoContinue } from "../../hooks/useAutoContinue";
import { useBefore } from "../../hooks/useBefore";
import { useNow } from "../../hooks/useNow";
import { ordinal } from "../../utils/arenaText";
import { partyName, possessive } from "../../utils/partyText";
import { playerStyle } from "../../utils/playerStyle";
import { faceName } from "./cardText";
import { MemoryBoard, type CardShown } from "./MemoryBoard";
import type { CardMoment } from "./MemoryCard";
import { turnMove } from "./loadedCards";
import { timeoutNotice } from "./timeoutNotice";
import { useMemorySounds } from "./useMemorySounds";

interface MemoryScreenProps {
  party: Party<"memory">;
  myId: PlayerId;
  clockOffsetMs: number;
  send(message: ClientMessage): void;
  /** The server's latest refusal: if it was your card's, it stops turning. */
  lastError: { error: RoomError; id: number } | null;
  /** Still in: the corner ✕ (the room asks first). */
  onQuit(): void;
  /** Quit or watching: the back arrow leaves the room. */
  onLeave(): void;
  /** The ending has shown (or was tapped away): on to the results. */
  onContinue(): void;
}

/** What the banner says on your turn: your first card, your second, or after a pair, that you go again. */
function yourTurnText(open: boolean, pairs: number): string {
  if (open) return "ONE MORE CARD!";
  if (pairs === 0) return "YOUR TURN!";
  return `${pairs > 1 ? `${pairs} PAIRS` : "PAIR"}! GO AGAIN!`;
}

/**
 * Memory: everyone on one board of face-down cards, two cards a turn; a pair is yours and you go again. Above the
 * board, everyone's color in turn order with their pairs so far (whose turn hops) and a banner saying whose turn: yours
 * fills with your color, someone else's is quiet. A miss shows for everyone, then turns back. The game ends on the
 * same screen (the board thumps, the banner turns into your result), then moves on to the results by itself.
 */
export function MemoryScreen({ party, myId, clockOffsetMs, send, lastError, onQuit, onLeave, onContinue }: MemoryScreenProps) {
  const game = party.game;
  const seatIds = party.entrants.map((e) => e.id);
  const seat = seatIds.indexOf(myId);
  const mySeat = seat === -1 ? null : seat;

  // Your card starts turning the moment you tap; the server then says what it is. If it refuses, the card turns back.
  const turnKey = `${party.startedAt}:${game.moves}`;
  const [pending, setPending] = useState<{ key: string; card: number } | null>(null);
  const [seenError, setSeenError] = useState(lastError);
  if (lastError !== seenError) {
    setSeenError(lastError);
    if (lastError && pending) setPending(null);
  }
  const turning = pending && pending.key === turnKey ? pending.card : null;

  const now = useNow(CLIENT_CONFIG.timerTickMs, !party.finished);
  // The latest card plays out (it turns; a pair pops; a miss shows, then turns back) before the next one can be turned.
  const playingOut = useBefore(turnKey, party.turnStartedAt - clockOffsetMs);
  // The latest card turned; nothing while the latest thing was a turn running out (it turns no card).
  const last = game.timeout === null ? game.lastMove : null;
  const missed = last !== null && last.cards.length === 2 && !last.matched;
  const missShowing = useBefore(missed ? turnKey : null, party.turnStartedAt - clockOffsetMs - MEMORY_CONFIG.flipMs);
  const over = party.finished && !playingOut;
  const stillIn = mySeat !== null && !over && isIn(game, mySeat);

  const turnId = over || game.over ? null : (seatIds[game.turn] ?? null);
  const myTurn = turnId === myId;
  const msLeft = partyDeadline(party) - clockOffsetMs - now;
  const clockShown = turnId !== null && msLeft <= CLIENT_CONFIG.countdownShowMs;
  const countdown = clockShown ? Math.max(0, Math.ceil(msLeft / 1000)) : null;

  // The ending: your win (shared or not), your place, or (watching) who won.
  const myResult = party.results.find((r) => r.id === myId);
  const champions = party.championIds;
  const tone = !over ? null : champions.includes(myId) ? "win" : myResult ? "lose" : "watch";
  const winnersText = champions.length > 1 ? `${champions.map((id) => partyName(party, id)).join(" & ")} WIN!` : `${champions[0] === undefined ? "" : partyName(party, champions[0])} WINS!`;
  const endingText = {
    win: champions.length > 1 ? "SHARED WIN!" : "YOU WIN!",
    lose: `YOU'RE ${ordinal(myResult?.place ?? 0).toUpperCase()}`,
    watch: winnersText,
  } as const;
  useAutoContinue(tone !== null, CLIENT_CONFIG.resultShowMs, onContinue);
  useMemorySounds({ gameKey: party.startedAt, game, mySeat, countdown: myTurn ? countdown : null, ending: tone });

  // A turn ran out (or put someone out), or someone quit: a short notice (with no list on screen, this is how everyone learns it).
  const [seen, setSeen] = useState({ key: party.startedAt, moves: game.moves, quits: game.quitOrder.length });
  const [notice, setNotice] = useState<{ text: string; id: number } | null>(null);
  if (seen.key !== party.startedAt || seen.moves !== game.moves || seen.quits !== game.quitOrder.length) {
    const sameGame = seen.key === party.startedAt;
    const timedOut = game.timeout;
    const gone = game.quitOrder.at(-1);
    setSeen({ key: party.startedAt, moves: game.moves, quits: game.quitOrder.length });
    if (sameGame && timedOut !== null && seen.moves !== game.moves) {
      const who = seatIds[timedOut.seat]!;
      setNotice({ text: timeoutNotice(timedOut, who === myId, partyName(party, who).toUpperCase()), id: game.moves });
    } else if (sameGame && seen.quits !== game.quitOrder.length && gone !== undefined && seatIds[gone] !== myId) {
      setNotice({ text: `${partyName(party, seatIds[gone]!).toUpperCase()} QUIT`, id: -game.quitOrder.length });
    }
  }
  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(null), CLIENT_CONFIG.toastDurationMs);
    return () => clearTimeout(timer);
  }, [notice]);

  // Pairs found in a row this turn (for the banner): the run of matched pairs behind the latest move.
  const [run, setRun] = useState({ key: turnKey, pairs: 0 });
  if (run.key !== turnKey) {
    const keeps = last !== null && run.key.startsWith(`${party.startedAt}:`);
    const pairs = !keeps || last.seat !== mySeat ? 0 : last.cards.length === 1 ? run.pairs : last.matched ? run.pairs + 1 : 0;
    setRun({ key: turnKey, pairs });
  }

  const canTap = myTurn && !party.finished && !playingOut && turning === null;
  // Stable between moves, so the cards (memoized) don't redraw with the clock.
  const onTurn = useCallback(
    (card: number) => {
      setPending({ key: turnKey, card });
      send({ type: "move", move: turnMove(card) });
    },
    [turnKey, send],
  );
  const cardsShown: CardShown[] = game.taken.map((owner, card) => {
    const shownInMiss = missShowing && last !== null && last.cards.includes(card) ? last.faces[last.cards.indexOf(card)]! : null;
    const faceIndex = game.cards[card] ?? shownInMiss;
    const face: MemoryFace | null = faceIndex === null ? null : (game.faces[faceIndex] ?? null);
    const inLast = last !== null && last.cards.includes(card) && last.cards.length === 2;
    const moment: CardMoment = turning === card ? "turning" : inLast && !over ? (last.matched ? "pair" : missShowing ? "miss" : null) : null;
    const finderId = owner === null ? null : seatIds[owner]!;
    return { face, name: face && faceName(face), finderId, finderQuit: owner !== null && game.quit[owner]!, moment, enabled: canTap && canTurn(game, card) };
  });

  // Quit or watching: back (leave the room) and settings on top; a WATCHING LIVE badge for those who joined late.
  const header = !stillIn && !over ? <Header onBack={onLeave} backLabel="Leave room" /> : undefined;
  // Like every turn-based game: everyone's screen takes the color of whose turn it is (then the winner's).
  const washId = over ? (champions.includes(myId) ? myId : (champions[0] ?? null)) : turnId;
  const stripPlayers = party.entrants.map((e, s) => ({ id: e.id, name: e.name, out: game.quit[s]!, quit: game.quit[s]!, score: pairsOf(game, s) }));
  const quitNow = mySeat !== null && !over && !stillIn;
  const banner =
    tone !== null ? (
      <TurnBanner tone={tone} playerId={tone === "win" ? myId : (champions[0] ?? myId)} text={endingText[tone]} />
    ) : turnId !== null ? (
      <TurnBanner
        tone={myTurn ? "yours" : "theirs"}
        playerId={turnId}
        text={myTurn ? yourTurnText(game.open !== null, run.pairs) : `${possessive(partyName(party, turnId))} TURN`}
        detail={quitNow ? "You quit · watching" : null}
        countdown={countdown}
      />
    ) : null;

  return (
    <ScreenLayout centered wide header={header} wash={washId === null ? undefined : playerStyle(washId)} onTap={tone !== null ? onContinue : undefined}>
      {stillIn && (
        <div className="fixed top-4 left-4 z-raised">
          <IconButton icon="close" label="Quit game" onClick={onQuit} />
        </div>
      )}
      {notice && <Toast key={notice.id} message={notice.text} />}
      <div
        className={clsx(
          "isolate flex w-full max-w-[min(var(--layout-board-large),calc((100dvh-var(--layout-party-reserve))*var(--cols)/var(--rows)))] flex-col items-stretch gap-6 px-2",
          "landscape:max-w-content-wide landscape:flex-row landscape:items-center landscape:justify-center",
          stillIn && "portrait:pt-[calc(var(--layout-icon-button)+var(--space-1))]",
        )}
        style={{ "--cols": game.cols, "--rows": game.rows, "--memory-header": header ? "calc(var(--layout-icon-button) + 2 * var(--layout-gutter))" : "0px" } as CSSProperties}
      >
        <div className="flex flex-col items-stretch gap-3 landscape:w-party-side landscape:flex-none">
          {mySeat === null && !over && (
            <Badge tone="ink" className="self-center">
              <span className="size-2 animate-live rounded-pill bg-coral" />
              WATCHING LIVE
            </Badge>
          )}
          {tone === null && <TurnStrip players={stripPlayers} activeIds={turnId === null ? [] : [turnId]} myId={myId} wrap={party.entrants.length > 4} />}
          {banner}
        </div>
        {/*
          Your win: sun rays turn behind the board in your color. In landscape the board takes the screen's whole height
          (the players' row and banner sit beside it), less the margins, a gap's worth of rounding and the header when it shows.
        */}
        <div
          className="relative landscape:w-[min(var(--layout-board-wide),calc((100dvh-2*var(--layout-gutter)-var(--space-2)-var(--memory-header))*var(--cols)/var(--rows)))] landscape:min-w-0 landscape:flex-initial"
          style={tone === "win" ? playerStyle(myId) : undefined}
        >
          {tone === "win" && <SunRays />}
          <MemoryBoard
            cols={game.cols}
            cards={cardsShown}
            ended={tone !== null}
            onTurn={onTurn}
          />
        </div>
      </div>
    </ScreenLayout>
  );
}
