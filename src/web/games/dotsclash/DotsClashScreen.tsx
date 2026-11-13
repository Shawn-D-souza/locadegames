import { clsx } from "clsx";
import { useEffect, useState, type CSSProperties } from "react";
import { DOTSCLASH_CONFIG } from "../../../shared/games/dotsclash/config";
import { canTap, isIn } from "../../../shared/games/dotsclash/rules";
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
import { CLIENT_CONFIG } from "../../config";
import { useAutoContinue } from "../../hooks/useAutoContinue";
import { useNow } from "../../hooks/useNow";
import { ordinal } from "../../utils/arenaText";
import { partyName, possessive } from "../../utils/partyText";
import { playerStyle, quitStyle } from "../../utils/playerStyle";
import { DotsBoard } from "./DotsBoard";
import { TurnBanner } from "./TurnBanner";
import { TurnStrip } from "./TurnStrip";
import { useChainPlayback, type BoardMoment } from "./useChainPlayback";
import { useDotsClashSounds } from "./useDotsClashSounds";

/**
 * Boards this many cells across or more (5+ players) sit beside the players' row and the banner in landscape, like a
 * board of small boards: on a laptop the board then gets the screen's whole height, so its many cells stay big.
 */
const BESIDE_FROM = 8;

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

/** The screen under the board while everyone picks (nobody's turn): plain (a dot grid behind the tiles would be too busy). */
const PLAIN_PAGE = { "--player-wash": "var(--color-board-page)" } as CSSProperties;

interface DotsClashScreenProps {
  party: Party;
  myId: PlayerId;
  clockOffsetMs: number;
  send(message: ClientMessage): void;
  /** Still in: the corner ✕ (the room asks first). */
  onQuit(): void;
  /** Out or watching: the back arrow leaves the room. */
  onLeave(): void;
  /** The ending has shown (or was tapped away): on to the results. */
  onContinue(): void;
}

/** Who went out in the latest exit, as a short notice ("BEN IS OUT!", "ANA & BEN ARE OUT!"): with up to 8 players there's no list on screen to show it. */
function exitNotice(party: Party, myId: PlayerId): string | null {
  const { game } = party;
  if (game.exits === 0) return null;
  const gone = party.entrants.filter((e, seat) => game.outAt[seat] === game.exits && e.id !== myId);
  if (gone.length === 0) return null;
  const names = gone.map((e) => e.name);
  const who = (names.length > 1 ? `${names.slice(0, -1).join(", ")} & ${names.at(-1)}` : names[0]!).toUpperCase();
  if (game.quit[party.entrants.indexOf(gone[0]!)]) return `${who} QUIT`;
  return `${who} ${names.length > 1 ? "ARE" : "IS"} OUT!`;
}

/**
 * Dots Clash: everyone on one board. First everyone picks a start at once, in secret (only your own shows on your
 * phone until all are in), then turns. Above the board, everyone's color in turn order (whoever the game waits for
 * hops) and a banner saying whose turn: yours fills with your color, someone else's is quiet. Nothing covers the board
 * (owner direction: it gets in the way of the game). Each tap's whole chain plays out wave by wave. The game ends on
 * the same screen (the board thumps, the banner turns into your result), then moves on to the results by itself.
 */
export function DotsClashScreen({ party, myId, clockOffsetMs, send, onQuit, onLeave, onContinue }: DotsClashScreenProps) {
  const game = party.game;
  const seatIds = party.entrants.map((e) => e.id);
  const seat = seatIds.indexOf(myId);
  const mySeat = seat === -1 ? null : seat;
  const { moment, playing } = useChainPlayback(game, party.startedAt);
  const settled = !playing;
  // What the last chain did (who it knocked out, that the game is over) shows only once it has played out on screen
  // (owner direction: nothing gives the ending away early). A quit shows at once.
  const over = party.finished && settled;
  const outShown = (s: number) => game.quit[s]! || (game.outAt[s] !== null && (settled || game.outAt[s] !== game.exits));
  const stillIn = mySeat !== null && !over && !outShown(mySeat);
  const now = useNow(CLIENT_CONFIG.timerTickMs, !party.finished);

  // Picking, all at once and in secret: your own pick shows on your board (only on yours) until every start is revealed.
  const pickPhase = !party.finished && game.phase === "pick";
  const pickKey = `${party.startedAt}:${game.moves}`;
  const [myPick, setMyPick] = useState<{ key: string; cell: number } | null>(null);
  const myPickCell = pickPhase && myPick?.key === pickKey ? myPick.cell : null;
  const mustPick = pickPhase && stillIn && game.picks[mySeat!] === null && myPickCell === null;
  const pickersLeft = pickPhase ? party.entrants.filter((_, s) => isIn(game, s) && game.picks[s] === null && s !== (myPickCell === null ? -1 : mySeat)) : [];

  // While a chain plays, the turn stays with whoever tapped; it moves on once it settles.
  const shownSeat = playing && game.lastMove ? game.lastMove.seat : game.turn;
  const turnId = over || pickPhase ? null : (seatIds[shownSeat] ?? null);
  const myTurn = settled && turnId === myId;
  const msLeft = partyDeadline(party) - clockOffsetMs - now;
  const clockShown = settled && (turnId !== null || pickPhase) && msLeft <= CLIENT_CONFIG.countdownShowMs;
  const countdown = clockShown ? Math.max(0, Math.ceil(msLeft / 1000)) : null;
  const outNow = mySeat !== null && !over && !stillIn;

  // The ending, once the last chain has settled: your win, your place, or (watching) who won.
  const winnerId = party.championIds[0] ?? null;
  const myResult = party.results.find((r) => r.id === myId);
  const tone = !over ? null : winnerId === myId ? "win" : myResult ? "lose" : "watch";
  const endingText = {
    win: "YOU WIN!",
    lose: `YOU'RE ${ordinal(myResult?.place ?? 0).toUpperCase()}`,
    watch: `${winnerId === null ? "" : partyName(party, winnerId)} WINS!`,
  } as const;
  useAutoContinue(tone !== null, CLIENT_CONFIG.resultShowMs, onContinue);
  useDotsClashSounds({ gameKey: party.startedAt, game, seatIds, mySeat, moment, playing, countdown: myTurn || mustPick ? countdown : null, ending: tone });

  // Someone went out: a short notice once their chain has settled on screen.
  const [seenExits, setSeenExits] = useState({ key: party.startedAt, exits: game.exits });
  const [notice, setNotice] = useState<{ text: string; id: number } | null>(null);
  if (settled && (seenExits.key !== party.startedAt || seenExits.exits !== game.exits)) {
    const text = seenExits.key === party.startedAt ? exitNotice(party, myId) : null;
    setSeenExits({ key: party.startedAt, exits: game.exits });
    if (text) setNotice({ text, id: game.exits });
  }
  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(null), CLIENT_CONFIG.toastDurationMs);
    return () => clearTimeout(timer);
  }, [notice]);

  const shown: BoardMoment =
    myPickCell === null
      ? moment
      : {
          ...moment,
          owners: moment.owners.map((owner, cell) => (cell === myPickCell ? mySeat : owner)),
          dots: moment.dots.map((dots, cell) => (cell === myPickCell ? DOTSCLASH_CONFIG.startDots : dots)),
        };
  const paintOf = (cell: number): CSSProperties | undefined => {
    const owner = shown.owners[cell];
    if (owner === null || owner === undefined) return undefined;
    return game.quit[owner] ? quitStyle() : playerStyle(seatIds[owner]!);
  };
  const labelOf = (cell: number) => {
    const owner = shown.owners[cell];
    const where = `Row ${Math.floor(cell / game.size) + 1}, column ${(cell % game.size) + 1}`;
    return owner === null || owner === undefined ? `${where}, empty` : `${where}, ${partyName(party, seatIds[owner]!)}, ${shown.dots[cell]} dots`;
  };

  // Out or watching: back (leave the room) and settings on top; a WATCHING LIVE badge for those who joined late.
  const header = !stillIn && !over ? <Header onBack={onLeave} backLabel="Leave room" /> : undefined;
  // Like every turn-based game: everyone's screen takes the color of whose turn it is (then the winner's); plain while picking.
  const washId = over ? winnerId : turnId;
  const wash = washId === null ? PLAIN_PAGE : playerStyle(washId);
  const stripPlayers = party.entrants.map((e, s) => ({ id: e.id, name: e.name, out: outShown(s), quit: game.quit[s]! }));
  const activeIds = pickPhase ? pickersLeft.map((e) => e.id) : turnId === null ? [] : [turnId];
  const turnName = turnId === null ? "" : partyName(party, turnId);
  const turnText = turnId === myId ? "YOUR TURN!" : `${possessive(turnName)} TURN`;
  const clashed = mySeat !== null && game.clashed[mySeat]!;
  const waitingFor = pickersLeft.length === 1 ? partyName(party, pickersLeft[0]!.id) : `${pickersLeft.length} PLAYERS`;
  const banner =
    tone !== null ? (
      <TurnBanner tone={tone} playerId={tone === "win" ? myId : (winnerId ?? myId)} text={endingText[tone]} />
    ) : pickPhase && mustPick ? (
      <TurnBanner
        tone="yours"
        playerId={myId}
        text={clashed ? "SAME CELL! PICK AGAIN!" : "PICK YOUR START!"}
        countdown={countdown}
      />
    ) : pickPhase ? (
      <TurnBanner tone="waiting" playerId={myId} text={`WAITING FOR ${waitingFor}`} detail={outNow ? "You're out · watching" : null} countdown={countdown} />
    ) : turnId !== null ? (
      <TurnBanner
        tone={turnId === myId ? "yours" : "theirs"}
        playerId={turnId}
        text={turnText}
        detail={outNow ? "You're out · watching" : null}
        countdown={countdown}
      />
    ) : null;

  const beside = game.size >= BESIDE_FROM;
  const layout = LAYOUT_CLASSES[beside ? "beside" : "stacked"];

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
          {tone === null && <TurnStrip players={stripPlayers} activeIds={activeIds} myId={myId} wrap={beside} />}
          {banner}
        </div>
        {/* Your win: sun rays turn behind the board in your color. */}
        <div
          className={clsx("relative", layout.board)}
          style={tone === "win" ? playerStyle(myId) : undefined}
        >
          {tone === "win" && <SunRays />}
          <DotsBoard
            size={game.size}
            moment={shown}
            paintOf={paintOf}
            labelOf={labelOf}
            canTap={(cell) => mySeat !== null && settled && myPickCell === null && canTap(game, mySeat, cell)}
            youPaint={playerStyle(myId)}
            ended={tone !== null}
            onTap={(cell) => {
              if (pickPhase) setMyPick({ key: pickKey, cell });
              send({ type: "move", move: cell });
            }}
          />
        </div>
      </div>
    </ScreenLayout>
  );
}
