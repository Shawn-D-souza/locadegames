import { clsx } from "clsx";
import { useEffect, useState } from "react";
import { lineAt } from "../../../shared/games/dotsboxes/board";
import { applyMove, boxesOf, isIn } from "../../../shared/games/dotsboxes/rules";
import type { DotsBoxesState } from "../../../shared/games/dotsboxes/types";
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
import { playerStyle, quitStyle } from "../../utils/playerStyle";
import { BoxesBoard } from "./BoxesBoard";
import { useDotsBoxesSounds } from "./useDotsBoxesSounds";

/** Boards this many boxes across or more (5+ players) sit beside the players' row and the banner in landscape, like Dots Clash's big boards. */
const BESIDE_FROM = 7;

/**
 * Where things go: stacked (players' row and banner above the board), or side by side. Small boards stack everywhere
 * but on a phone held sideways (too short for anything above the board); big boards go side by side in any landscape.
 */
const LAYOUT_CLASSES = {
  stacked: {
    column: "sideways:max-w-(--layout-board-wide) sideways:flex-row sideways:items-center",
    info: "sideways:min-w-0 sideways:flex-1",
    board: "sideways:w-[min(60%,calc(100dvh-var(--layout-board-reserve)-var(--layout-tap)))] sideways:flex-none",
  },
  beside: {
    column: "landscape:max-w-content-wide landscape:flex-row landscape:items-center landscape:justify-center",
    info: "landscape:w-party-side landscape:flex-none",
    board: "landscape:w-[min(var(--layout-board-wide),calc(100dvh-var(--layout-board-reserve)-var(--layout-tap)))] landscape:min-w-0 landscape:flex-initial",
  },
} as const;

interface DotsBoxesScreenProps {
  party: Party<"dotsboxes">;
  myId: PlayerId;
  clockOffsetMs: number;
  send(message: ClientMessage): void;
  /** The server's latest refusal: if it was your line's, the board goes back to the server's. */
  lastError: { error: RoomError; id: number } | null;
  /** Still in: the corner ✕ (the room asks first). */
  onQuit(): void;
  /** Quit or watching: the back arrow leaves the room. */
  onLeave(): void;
  /** The ending has shown (or was tapped away): on to the results. */
  onContinue(): void;
}

/** "ROW 2, COLUMN 3" style names for a line, by the dots at its ends. */
function lineLabel(size: number, line: number): string {
  const { horizontal, row, col } = lineAt(size, line);
  const to = horizontal ? `row ${row + 1}, column ${col + 2}` : `row ${row + 2}, column ${col + 1}`;
  return `Line from row ${row + 1}, column ${col + 1} to ${to}`;
}

/** What the banner says on your turn: after a box, that you go again. */
function yourTurnText(won: number): string {
  if (won === 0) return "YOUR TURN!";
  return `${won > 1 ? `${won} BOXES` : "BOX"}! GO AGAIN!`;
}

/**
 * Dots & Boxes: everyone on one board, one line each turn; a box's fourth side wins it and you draw again. Above the
 * board, everyone's color in turn order with their boxes so far (whose turn hops) and a banner saying whose turn:
 * yours fills with your color, someone else's is quiet. Nothing covers the board. The game ends on the same screen
 * (the board thumps, the banner turns into your result), then moves on to the results by itself.
 */
export function DotsBoxesScreen({ party, myId, clockOffsetMs, send, lastError, onQuit, onLeave, onContinue }: DotsBoxesScreenProps) {
  const seatIds = party.entrants.map((e) => e.id);
  const seat = seatIds.indexOf(myId);
  const mySeat = seat === -1 ? null : seat;

  // Your line shows the moment you tap (the same rules the server runs, so the box it wins too), not a round trip
  // later; the server's copy then takes over unchanged. If the server refuses it, the board goes back to the server's.
  const turnKey = `${party.startedAt}:${party.game.moves}`;
  const [local, setLocal] = useState<{ key: string; state: DotsBoxesState; refused: boolean } | null>(null);
  const localNow = local && local.key === turnKey && !local.refused ? local : null;
  const [seenError, setSeenError] = useState(lastError);
  if (lastError !== seenError) {
    setSeenError(lastError);
    if (lastError && local && !local.refused) setLocal({ ...local, refused: true });
  }
  const game = localNow ? localNow.state : party.game;
  const now = useNow(CLIENT_CONFIG.timerTickMs, !party.finished);
  // The last line (and its boxes) draws in before the ending shows: the server's clock says when (`turnStartedAt`).
  const drawingIn = useBefore(party.finished ? `${party.startedAt}` : null, party.turnStartedAt - clockOffsetMs);
  const over = party.finished && !drawingIn;
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
  useDotsBoxesSounds({ gameKey: party.startedAt, game, mySeat, countdown: myTurn ? countdown : null, ending: tone });

  // Someone quit: a short notice (with no list on screen, this is how everyone learns it).
  const [seenQuits, setSeenQuits] = useState({ key: party.startedAt, quits: game.quitOrder.length });
  const [notice, setNotice] = useState<{ text: string; id: number } | null>(null);
  if (seenQuits.key !== party.startedAt || seenQuits.quits !== game.quitOrder.length) {
    const gone = game.quitOrder.at(-1);
    setSeenQuits({ key: party.startedAt, quits: game.quitOrder.length });
    if (seenQuits.key === party.startedAt && gone !== undefined && seatIds[gone] !== myId) {
      setNotice({ text: `${partyName(party, seatIds[gone]!).toUpperCase()} QUIT`, id: game.quitOrder.length });
    }
  }
  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(null), CLIENT_CONFIG.toastDurationMs);
    return () => clearTimeout(timer);
  }, [notice]);

  const last = game.lastMove;
  const paintOfBox = (box: number) => {
    const owner = game.boxes[box]!;
    return game.quit[owner] ? quitStyle() : playerStyle(seatIds[owner]!);
  };

  // Quit or watching: back (leave the room) and settings on top; a WATCHING LIVE badge for those who joined late.
  const header = !stillIn && !over ? <Header onBack={onLeave} backLabel="Leave room" /> : undefined;
  // Like every turn-based game: everyone's screen takes the color of whose turn it is (then the winner's).
  const washId = over ? (champions.includes(myId) ? myId : (champions[0] ?? null)) : turnId;
  const stripPlayers = party.entrants.map((e, s) => ({ id: e.id, name: e.name, out: game.quit[s]!, quit: game.quit[s]!, score: boxesOf(game, s) }));
  const wonNow = last !== null && last.seat === mySeat && myTurn ? last.boxes.length : 0;
  const quitNow = mySeat !== null && !over && !stillIn;
  const banner =
    tone !== null ? (
      <TurnBanner tone={tone} playerId={tone === "win" ? myId : (champions[0] ?? myId)} text={endingText[tone]} />
    ) : turnId !== null ? (
      <TurnBanner
        tone={myTurn ? "yours" : "theirs"}
        playerId={turnId}
        text={myTurn ? yourTurnText(wonNow) : `${possessive(partyName(party, turnId))} TURN`}
        detail={quitNow ? "You quit · watching" : null}
        countdown={countdown}
      />
    ) : null;

  const beside = game.size >= BESIDE_FROM;
  const layout = LAYOUT_CLASSES[beside ? "beside" : "stacked"];

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
          "isolate flex w-full max-w-[min(var(--layout-board-large),calc(100dvh-var(--layout-party-reserve)))] flex-col items-stretch gap-6 px-2",
          layout.column,
          stillIn && "portrait:pt-[calc(var(--layout-icon-button)+var(--space-1))]",
        )}
      >
        <div className={clsx("flex flex-col items-stretch gap-3", layout.info)}>
          {mySeat === null && !over && (
            <Badge tone="ink" className="self-center">
              <span className="size-2 animate-live rounded-pill bg-coral" />
              WATCHING LIVE
            </Badge>
          )}
          {tone === null && <TurnStrip players={stripPlayers} activeIds={turnId === null ? [] : [turnId]} myId={myId} wrap={beside} />}
          {banner}
        </div>
        {/* Your win: sun rays turn behind the board in your color. */}
        <div className={clsx("relative", layout.board)} style={tone === "win" ? playerStyle(myId) : undefined}>
          {tone === "win" && <SunRays />}
          <BoxesBoard
            size={game.size}
            drawn={game.drawn}
            boxes={game.boxes}
            last={last === null || over ? null : { line: last.line, paint: playerStyle(seatIds[last.seat]!) }}
            paintOfBox={paintOfBox}
            // While your line waits for the server, no second tap (it would only be refused).
            canDraw={myTurn && !party.finished && localNow === null}
            youPaint={playerStyle(myId)}
            labelOfLine={(line) => lineLabel(game.size, line)}
            ended={tone !== null}
            onDraw={(line) => {
              const drawn = applyMove(party.game, mySeat!, line);
              if (drawn.ok) setLocal({ key: turnKey, state: drawn.state, refused: false });
              send({ type: "move", move: line });
            }}
          />
        </div>
      </div>
    </ScreenLayout>
  );
}
