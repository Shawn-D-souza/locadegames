import { clsx } from "clsx";
import { useEffect, useState, type CSSProperties } from "react";
import { SNAKESLADDERS_CONFIG } from "../../../shared/games/snakesladders/config";
import { hasQuit } from "../../../shared/games/snakesladders/rules";
import type { SnakesRoll } from "../../../shared/games/snakesladders/types";
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
import { pieceAt } from "./geometry";
import { rollMove } from "../dice/loadedDice";
import { RollBar } from "../dice/RollBar";
import { SnakesBoard, type BoardPiece } from "./SnakesBoard";
import { useRollPlayback } from "./useRollPlayback";
import { useSnakesLaddersSounds } from "./useSnakesLaddersSounds";

/** The screen while nobody's turn shows (between games): plain. */
const PLAIN_PAGE = { "--player-wash": "var(--color-board-page)" } as CSSProperties;

interface SnakesLaddersScreenProps {
  party: Party<"snakesladders">;
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

/** What a roll that has just played out tells everyone, as a short notice at the top (with no player list, this is how they learn it). */
function rollNotice(party: Party<"snakesladders">, roll: SnakesRoll, myId: PlayerId): string | null {
  const mine = party.entrants[roll.seat]!.id === myId;
  const name = party.entrants[roll.seat]!.name.toUpperCase();
  if (roll.finished) {
    const place = ordinal(party.game.finishOrder.indexOf(roll.seat) + 1).toUpperCase();
    return mine ? `YOU'RE ${place}!` : `${name} IS ${place}!`;
  }
  if (roll.kind === "threeSixes") return mine ? "THREE 6s! BACK YOU GO" : `${name}: THREE 6s!`;
  if (roll.kind === "stuck" && mine) return `YOU NEED A ${SNAKESLADDERS_CONFIG.finish - roll.from}!`;
  return null;
}

/**
 * Snakes & Ladders: everyone's pieces on one board, one roll at a time. Above the board, everyone's color in turn order
 * (whose turn hops; who got home shows their place); under it, near your thumb, the die and either your ROLL! or whose
 * turn it is. Every roll plays out the same on every phone: the die tumbles, the piece hops square by square, then up a
 * ladder or down a snake. The game goes on until everyone but one is home, then ends on the same screen (the board
 * thumps, the banner turns into your place) and moves on to the results by itself.
 */
export function SnakesLaddersScreen({ party, myId, clockOffsetMs, send, onQuit, onLeave, onContinue }: SnakesLaddersScreenProps) {
  const game = party.game;
  const seatIds = party.entrants.map((e) => e.id);
  const seat = seatIds.indexOf(myId);
  const mySeat = seat === -1 ? null : seat;
  const { roll, ms } = useRollPlayback(game, party.startedAt);
  const playing = roll !== null;
  // What the roll did (who got home, whose turn is next, the ending) shows once it has played out on screen.
  const over = party.finished && !playing;
  const homeShown = (s: number) => game.finishOrder.includes(s) && !(playing && roll.finished && roll.seat === s);
  const placeOf = (s: number) => (homeShown(s) ? game.finishOrder.indexOf(s) + 1 : null);
  const stillIn = mySeat !== null && !over && !homeShown(mySeat) && !hasQuit(game, mySeat);
  const now = useNow(CLIENT_CONFIG.timerTickMs, !party.finished);

  // While a roll plays out the turn stays with whoever rolled; it moves on once the piece has landed.
  const turnSeat = playing ? roll.seat : game.turn;
  const turnId = over || turnSeat < 0 ? null : (seatIds[turnSeat] ?? null);
  const myTurn = !playing && !party.finished && turnId === myId;
  const again = !playing && game.sixes > 0;
  const msLeft = partyDeadline(party) - clockOffsetMs - now;
  const countdown = !playing && turnId !== null && msLeft <= CLIENT_CONFIG.countdownShowMs ? Math.max(0, Math.ceil(msLeft / 1000)) : null;
  // A roll sent: the button waits for it to come back (one roll per tap).
  const rollKey = `${party.startedAt}:${game.moves}`;
  const [sentFor, setSentFor] = useState<string | null>(null);
  const canRoll = myTurn && sentFor !== rollKey;

  // The ending, once the last roll has played out: your win, your place, or (watching) who won.
  const winnerId = party.championIds[0] ?? null;
  const myResult = party.results.find((r) => r.id === myId);
  const tone = !over ? null : winnerId === myId ? "win" : myResult ? "lose" : "watch";
  const endingText = {
    win: "YOU WIN!",
    lose: `YOU'RE ${ordinal(myResult?.place ?? 0).toUpperCase()}`,
    watch: `${winnerId === null ? "" : partyName(party, winnerId)} WINS!`,
  } as const;
  useAutoContinue(tone !== null, CLIENT_CONFIG.resultShowMs, onContinue);
  useSnakesLaddersSounds({
    roll,
    seatIds,
    mySeat,
    myTurn: myTurn && game.sixes === 0,
    countdown: myTurn ? countdown : null,
    ending: tone,
    gameKey: party.startedAt,
  });

  // A roll has played out (or someone quit): a short notice at the top.
  const [seen, setSeen] = useState({ key: party.startedAt, moves: game.moves, quits: game.quitOrder.length });
  const [notice, setNotice] = useState<{ text: string; id: number } | null>(null);
  if (!playing && (seen.key !== party.startedAt || seen.moves !== game.moves || seen.quits !== game.quitOrder.length)) {
    const sameGame = seen.key === party.startedAt;
    const quitter = sameGame && game.quitOrder.length > seen.quits ? party.entrants[game.quitOrder.at(-1)!]! : null;
    const text =
      sameGame && game.moves === seen.moves + 1 && game.lastRoll
        ? rollNotice(party, game.lastRoll, myId)
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

  // The pieces: everyone still in the game where they stand (a quitter's piece leaves), the one rolling where it is now.
  const pieces: BoardPiece[] = party.entrants.flatMap((e, s) =>
    hasQuit(game, s) || (playing && roll.seat === s) ? [] : [{ key: e.id, square: game.positions[s]!, paint: playerStyle(e.id), mine: e.id === myId }],
  );
  const moving = playing ? { key: seatIds[roll.seat]!, paint: playerStyle(seatIds[roll.seat]!), mine: roll.seat === mySeat, pose: pieceAt(roll, ms) } : null;
  const boardLabel = party.entrants
    .flatMap((e, s) => (hasQuit(game, s) ? [] : [`${e.name}: ${game.positions[s] === 0 ? "not on the board yet" : `square ${game.positions[s]}`}`]))
    .join(", ");

  const header = !stillIn && !over ? <Header onBack={onLeave} backLabel="Leave room" /> : undefined;
  // Like every turn-based game: everyone's screen takes the color of whose turn it is (then the winner's).
  const washId = over ? winnerId : turnId;
  const wash = washId === null ? PLAIN_PAGE : playerStyle(washId);
  const stripPlayers = party.entrants.map((e, s) => ({ id: e.id, name: e.name, out: hasQuit(game, s), quit: hasQuit(game, s), place: placeOf(s) }));
  const myPlace = mySeat === null ? null : placeOf(mySeat);
  const detail = myPlace !== null ? `You're ${ordinal(myPlace)} · watching` : null;
  const turnName = turnId === null ? "" : partyName(party, turnId);
  const banner =
    tone !== null ? (
      <TurnBanner tone={tone} playerId={tone === "win" ? myId : (winnerId ?? myId)} text={endingText[tone]} />
    ) : turnId !== null ? (
      <TurnBanner
        tone={turnId === myId ? "yours" : "theirs"}
        playerId={turnId}
        text={turnId === myId ? "YOUR TURN!" : again ? `${turnName} ROLLS AGAIN` : `${possessive(turnName)} TURN`}
        detail={detail}
        countdown={turnId === myId ? null : countdown}
      />
    ) : null;
  const face = roll?.die ?? game.lastRoll?.die ?? null;

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
          "isolate flex w-full max-w-[min(var(--layout-board-large),calc(100dvh-var(--layout-snakes-reserve)))] flex-col items-stretch gap-4 px-2",
          "landscape:max-w-content-wide landscape:flex-row landscape:items-center landscape:justify-center landscape:gap-6",
          stillIn && "portrait:pt-[calc(var(--layout-icon-button)+var(--space-1))]",
        )}
      >
        {/* Your win: sun rays turn behind the board in your color. */}
        <div
          className="relative landscape:w-[min(var(--layout-board-wide),calc(100dvh-var(--layout-board-reserve)-var(--layout-tap)))] landscape:min-w-0 landscape:flex-initial"
          style={tone === "win" ? playerStyle(myId) : undefined}
        >
          {tone === "win" && <SunRays />}
          <SnakesBoard pieces={pieces} moving={moving} ended={tone !== null} label={boardLabel} />
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
            tumbleMs={playing ? ms : null}
            canRoll={canRoll}
            again={again}
            countdown={countdown}
            banner={banner}
            onRoll={() => {
              setSentFor(rollKey);
              send({ type: "move", move: rollMove() });
            }}
          />
        </div>
      </div>
    </ScreenLayout>
  );
}
