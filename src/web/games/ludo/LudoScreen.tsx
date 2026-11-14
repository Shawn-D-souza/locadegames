import { clsx } from "clsx";
import { useEffect, useState, type CSSProperties } from "react";
import { armOf, boardFor, homeProgress } from "../../../shared/games/ludo/board";
import { hasQuit, movablePawns } from "../../../shared/games/ludo/rules";
import type { LudoAction } from "../../../shared/games/ludo/types";
import { partyDeadline } from "../../../shared/party/party";
import type { Party } from "../../../shared/party/types";
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
import { useNow } from "../../hooks/useNow";
import { ordinal } from "../../utils/arenaText";
import { partyName, possessive } from "../../utils/partyText";
import { playerStyle } from "../../utils/playerStyle";
import { rollMove } from "../dice/loadedDice";
import { RollBar } from "../dice/RollBar";
import { ludoLayout } from "./geometry";
import { LudoBoard, type BoardPawn } from "./LudoBoard";
import { movingPawns } from "./motion";
import { placePawns } from "./placePawns";
import { useActionPlayback } from "./useActionPlayback";
import { useLudoSounds } from "./useLudoSounds";

/** The screen while nobody's turn shows (between games): plain. */
const PLAIN_PAGE = { "--player-wash": "var(--color-board-page)" } as CSSProperties;

interface LudoScreenProps {
  party: Party<"ludo">;
  myId: PlayerId;
  clockOffsetMs: number;
  send(message: ClientMessage): void;
  /** Still racing: the corner ✕ (the room asks first). */
  onQuit(): void;
  /** Finished, quit or watching: the back arrow leaves the room. */
  onLeave(): void;
  /** The ending has shown (or was tapped away): on to the results. */
  onContinue(): void;
}

/** What an action that has just played out tells everyone, as a short notice at the top. */
function actionNotice(party: Party<"ludo">, action: LudoAction, myId: PlayerId): string | null {
  const nameOf = (seat: number) => party.entrants[seat]!.name.toUpperCase();
  const mine = party.entrants[action.seat]!.id === myId;
  if (action.finished) {
    const place = ordinal(party.game.finishOrder.indexOf(action.seat) + 1).toUpperCase();
    return mine ? `YOU'RE ${place}!` : `${nameOf(action.seat)} IS ${place}!`;
  }
  const captured = action.step?.captured ?? [];
  if (captured.length > 0) {
    const victims = [...new Set(captured.map((c) => c.seat))];
    const myVictim = victims.some((seat) => party.entrants[seat]!.id === myId);
    if (mine) return `YOU CAPTURED ${victims.map(nameOf).join(" & ")}!`;
    return myVictim ? `${nameOf(action.seat)} CAPTURED YOU!` : `${nameOf(action.seat)} CAPTURED ${victims.map(nameOf).join(" & ")}!`;
  }
  if (action.outcome === "threeSixes") return mine ? "THREE 6s! TURN OVER" : `${nameOf(action.seat)}: THREE 6s!`;
  if (action.outcome === "noMove" && mine && !action.again) return "NO PAWN CAN MOVE";
  return null;
}

/**
 * Ludo: everyone's pawns on one board that grows with the room (a cross, a 6- or an 8-arm star), turned so your arm
 * points down with your base at the bottom left. Above the board, everyone's color in turn order; under it, the die and
 * either your ROLL! or whose turn it is. A roll plays out the same on every phone; when more than one of your pawns can
 * move, the ones that can hop and you tap one. The game goes on until everyone but one has all four pawns home, then
 * ends on the same screen and moves on to the results by itself.
 */
export function LudoScreen({ party, myId, clockOffsetMs, send, onQuit, onLeave, onContinue }: LudoScreenProps) {
  const game = party.game;
  const players = party.entrants.length;
  const seatIds = party.entrants.map((e) => e.id);
  const seat = seatIds.indexOf(myId);
  const mySeat = seat === -1 ? null : seat;
  const board = boardFor(players);
  const armOfSeat = (s: number) => armOf(board, s, players);
  // Your arm points down; watching, the first in turn order's.
  // The React Compiler keeps these the same between frames (so the board's drawing isn't redrawn) until someone quits.
  const layout = ludoLayout(board, armOf(board, mySeat ?? 0, players));
  const owners = Array.from({ length: board.arms }, (_, arm) => {
    const s = seatIds.findIndex((_, i) => armOf(board, i, players) === arm);
    return s === -1 ? null : { id: seatIds[s]!, quit: game.quitOrder.includes(s) };
  });

  const { action, ms } = useActionPlayback(game, party.startedAt);
  const playing = action !== null;
  const over = party.finished && !playing;
  const homeShown = (s: number) => game.finishOrder.includes(s) && !(playing && action.finished && action.seat === s);
  const placeOf = (s: number) => (homeShown(s) ? game.finishOrder.indexOf(s) + 1 : null);
  const stillIn = mySeat !== null && !over && !homeShown(mySeat) && !hasQuit(game, mySeat);
  const now = useNow(CLIENT_CONFIG.timerTickMs, !party.finished);

  // While an action plays out the turn stays with whoever made it; it moves on once it has played out.
  const turnSeat = playing ? action.seat : game.turn;
  const turnId = over || turnSeat < 0 ? null : (seatIds[turnSeat] ?? null);
  const myTurn = !playing && !party.finished && turnId === myId;
  const picking = myTurn && game.die !== null;
  const rollingAgain = !playing && game.last?.again === true && game.last.seat === game.turn;
  const msLeft = partyDeadline(party) - clockOffsetMs - now;
  const countdown = !playing && turnId !== null && msLeft <= CLIENT_CONFIG.countdownShowMs ? Math.max(0, Math.ceil(msLeft / 1000)) : null;
  // One action per tap: the button (or the pawns) wait for it to come back.
  const actionKey = `${party.startedAt}:${game.moves}`;
  const [sentFor, setSentFor] = useState<string | null>(null);
  const canRoll = myTurn && game.die === null && sentFor !== actionKey;
  const canPick = picking && sentFor !== actionKey;

  const winnerId = party.championIds[0] ?? null;
  const myResult = party.results.find((r) => r.id === myId);
  const tone = !over ? null : winnerId === myId ? "win" : myResult ? "lose" : "watch";
  const endingText = {
    win: "YOU WIN!",
    lose: `YOU'RE ${ordinal(myResult?.place ?? 0).toUpperCase()}`,
    watch: `${winnerId === null ? "" : partyName(party, winnerId)} WINS!`,
  } as const;
  useAutoContinue(tone !== null, CLIENT_CONFIG.resultShowMs, onContinue);
  useLudoSounds({
    action,
    seatIds,
    mySeat,
    myTurn: myTurn && game.die === null && !rollingAgain,
    countdown: myTurn ? countdown : null,
    ending: tone,
    gameKey: party.startedAt,
  });

  // An action has played out (or someone quit): a short notice at the top.
  const [seen, setSeen] = useState({ key: party.startedAt, moves: game.moves, quits: game.quitOrder.length });
  const [notice, setNotice] = useState<{ text: string; id: number } | null>(null);
  if (!playing && (seen.key !== party.startedAt || seen.moves !== game.moves || seen.quits !== game.quitOrder.length)) {
    const sameGame = seen.key === party.startedAt;
    const quitter = sameGame && game.quitOrder.length > seen.quits ? party.entrants[game.quitOrder.at(-1)!]! : null;
    const text =
      sameGame && game.moves === seen.moves + 1 && game.last
        ? actionNotice(party, game.last, myId)
        : quitter && quitter.id !== myId
          ? `${quitter.name.toUpperCase()} QUIT`
          : null;
    setSeen({ key: party.startedAt, moves: game.moves, quits: game.quitOrder.length });
    if (text) setNotice({ text, id: game.moves * 100 + game.quitOrder.length });
  }
  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(null), CLIENT_CONFIG.toastDurationMs);
    return () => clearTimeout(timer);
  }, [notice]);

  // The pawns: those the action moves where they are now, the rest where they stand; while you pick, yours that can move hop.
  const moving = action ? movingPawns(action, layout, armOfSeat, ms) : new Map();
  const movable = canPick ? movablePawns(game, mySeat!, game.die!) : [];
  const pick = (pawn: number) => {
    setSentFor(actionKey);
    send({ type: "move", move: { pawn } });
  };
  const pawns: BoardPawn[] = placePawns(game, layout, armOfSeat, moving).map((p) => {
    const mine = p.seat === mySeat;
    return { ...p, paint: playerStyle(seatIds[p.seat]!), mine, ...(mine && movable.includes(p.pawn) && { onPick: () => pick(p.pawn) }) };
  });
  const home = homeProgress(board);
  const boardLabel = party.entrants
    .flatMap((e, s) => {
      if (hasQuit(game, s)) return [];
      const at = game.pawns[s]!;
      const out = at.filter((p) => p >= 0 && p < home).sort((a, b) => b - a);
      return [`${e.name}: ${at.filter((p) => p < 0).length} in base, ${at.filter((p) => p === home).length} home${out.length ? `, on ${out.join(" & ")}` : ""}`];
    })
    .join("; ");

  const header = !stillIn && !over ? <Header onBack={onLeave} backLabel="Leave room" /> : undefined;
  const washId = over ? winnerId : turnId;
  const wash = washId === null ? PLAIN_PAGE : playerStyle(washId);
  const stripPlayers = party.entrants.map((e, s) => ({ id: e.id, name: e.name, out: hasQuit(game, s), quit: hasQuit(game, s), place: placeOf(s) }));
  const myPlace = mySeat === null ? null : placeOf(mySeat);
  const detail = myPlace !== null ? `You're ${ordinal(myPlace)} · watching` : null;
  const turnName = turnId === null ? "" : partyName(party, turnId);
  const theirText = !playing && game.die !== null ? `${turnName} IS MOVING` : rollingAgain ? `${turnName} ROLLS AGAIN` : `${possessive(turnName)} TURN`;
  const banner =
    tone !== null ? (
      <TurnBanner tone={tone} playerId={tone === "win" ? myId : (winnerId ?? myId)} text={endingText[tone]} />
    ) : turnId !== null ? (
      <TurnBanner
        tone={turnId === myId ? "yours" : "theirs"}
        playerId={turnId}
        text={turnId === myId ? (picking ? "MOVE A PAWN!" : "YOUR TURN!") : theirText}
        detail={detail}
        countdown={turnId === myId && !picking ? null : countdown}
      />
    ) : null;
  const face = action?.die ?? game.last?.die ?? null;

  return (
    <ScreenLayout centered wide header={header} wash={wash} onTap={tone !== null ? onContinue : undefined}>
      {stillIn && (
        <div className="fixed top-4 left-4 z-raised">
          <IconButton icon="close" label="Quit game" onClick={onQuit} />
        </div>
      )}
      {notice && <Toast key={notice.id} message={notice.text} />}
      <div
        className={clsx(
          "isolate flex w-full max-w-[min(var(--layout-board-large),calc(100dvh-var(--layout-ludo-reserve)))] flex-col items-stretch gap-4 px-2",
          "landscape:max-w-content-wide landscape:flex-row landscape:items-center landscape:justify-center landscape:gap-6",
          stillIn && "portrait:pt-[calc(var(--layout-icon-button)+var(--space-1))]",
        )}
      >
        <div
          className="relative landscape:w-[min(var(--layout-board-wide),calc(100dvh-var(--layout-board-reserve)-var(--layout-tap)))] landscape:min-w-0 landscape:flex-initial"
          style={tone === "win" ? playerStyle(myId) : undefined}
        >
          {tone === "win" && <SunRays />}
          <LudoBoard layout={layout} owners={owners} pawns={pawns} ended={tone !== null} label={boardLabel} />
        </div>
        <div className="flex flex-col items-stretch gap-4 portrait:contents landscape:w-party-side landscape:flex-none">
          <div className="flex flex-col items-stretch gap-3 portrait:order-first">
            {mySeat === null && !over && (
              <Badge tone="ink" className="self-center">
                <span className="size-2 animate-live rounded-pill bg-coral" />
                WATCHING LIVE
              </Badge>
            )}
            {tone === null && <TurnStrip players={stripPlayers} activeIds={turnId === null ? [] : [turnId]} myId={myId} wrap shape="disc" />}
          </div>
          <RollBar
            face={face}
            tumbleMs={playing && action.rolled ? ms : null}
            canRoll={canRoll}
            again={rollingAgain}
            countdown={countdown}
            banner={banner}
            onRoll={() => {
              setSentFor(actionKey);
              send({ type: "move", move: rollMove() });
            }}
          />
        </div>
      </div>
    </ScreenLayout>
  );
}
