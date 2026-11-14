import { clsx } from "clsx";
import { useEffect, useState, type CSSProperties } from "react";
import { POOL_CONFIG } from "../../../shared/games/pool/config";
import { ballsLeft, hasQuit, isOut, onTheBlack } from "../../../shared/games/pool/rules";
import type { BallOwner, PoolShot } from "../../../shared/games/pool/types";
import { partyDeadline } from "../../../shared/party/party";
import type { Party } from "../../../shared/party/types";
import type { ClientMessage } from "../../../shared/protocol/messages";
import type { PlayerId } from "../../../shared/rooms/types";
import { IconButton } from "../../components/IconButton";
import { ScreenLayout } from "../../components/ScreenLayout";
import { TurnBanner } from "../../components/TurnBanner";
import { TurnStrip } from "../../components/TurnStrip";
import { CLIENT_CONFIG } from "../../config";
import { useAutoContinue } from "../../hooks/useAutoContinue";
import { useLandscape } from "../../hooks/useLandscape";
import { useNow } from "../../hooks/useNow";
import { ordinal } from "../../utils/arenaText";
import { partyName, possessive } from "../../utils/partyText";
import { playerStyle } from "../../utils/playerStyle";
import { shotMove } from "./loadedShots";
import { ballColor, POOL_LOOK, POOL_PAINT } from "./look";
import { PoolStatus } from "./PoolStatus";
import { PoolTable } from "./PoolTable";
import { shotNotice } from "./shotNotice";
import { aimedCue, sceneBalls, strikingCue, type BallPaint } from "./tableScene";
import { useCueControl } from "./useCueControl";
import { usePoolSounds } from "./usePoolSounds";
import { useShotPlayback } from "./useShotPlayback";

/** The screen while nobody's turn shows (between games): plain. */
const PLAIN_PAGE = { "--player-wash": "var(--color-board-page)" } as CSSProperties;
const { length: L, width: W, footSpotX } = POOL_CONFIG.table;

interface PoolScreenProps {
  party: Party<"pool">;
  myId: PlayerId;
  clockOffsetMs: number;
  send(message: ClientMessage): void;
  /** Still in: the corner ✕ (the room asks first). */
  onQuit(): void;
  /** Out, quit or watching: the back arrow leaves the room. */
  onLeave(): void;
  /** The ending has shown (or was tapped away): on to the results. */
  onContinue(): void;
}

/** Where the cue points before you touch the table: at the rack for the break, else toward the middle of the table. */
function defaultAim(cueBall: { x: number; y: number }, breakShot: boolean): { dx: number; dy: number } {
  const to = breakShot ? { x: footSpotX, y: W / 2 } : { x: L / 2, y: W / 2 };
  const dx = to.x - cueBall.x;
  const dy = to.y - cueBall.y;
  const length = Math.sqrt(dx * dx + dy * dy);
  return length < POOL_LOOK.aimDeadZone ? { dx: 1, dy: 0 } : { dx: dx / length, dy: dy / length };
}

/**
 * Pool: everyone's balls on one table, each player's in their own color (yours with a white dot). Above it, everyone in
 * turn order with how many balls they have left and one line saying whose shot it is (the ending's result there too). Everything with the cue (owner direction:
 * no button): sweep round the ball to aim; take hold of the cue (on it, or a long press anywhere), pull straight back, let go. Every phone sees the
 * strike and the balls roll at the same moment. No aim line (owner decision). The game ends when someone sinks the black
 * after all of theirs, or only one is left; then the results by themselves.
 */
export function PoolScreen({ party, myId, clockOffsetMs, send, onQuit, onLeave, onContinue }: PoolScreenProps) {
  const game = party.game;
  const seatIds = party.entrants.map((e) => e.id);
  const seat = seatIds.indexOf(myId);
  const mySeat = seat === -1 ? null : seat;
  const portrait = !useLandscape();

  const playback = useShotPlayback(game, party.startedAt, party.turnStartedAt, clockOffsetMs);
  const playing = playback !== null;
  const shooting = playback?.shot ?? null;
  const over = party.finished && !playing;
  // While a shot plays out, who is out stays as it was before it.
  const outShown = (s: number) => isOut(game, s) && !(shooting?.out && shooting.seat === s);
  const stillIn = mySeat !== null && !over && !outShown(mySeat) && !hasQuit(game, mySeat);
  const now = useNow(CLIENT_CONFIG.timerTickMs, !party.finished);

  const turnSeat = shooting ? shooting.seat : game.turn;
  const turnId = over || turnSeat < 0 ? null : (seatIds[turnSeat] ?? null);
  const myTurn = !playing && !party.finished && turnId === myId;
  const shootingAgain = !playing && game.last?.kind === "shot" && game.last.again && game.last.seat === game.turn;
  const msLeft = partyDeadline(party) - clockOffsetMs - now;
  const countdown = !playing && turnId !== null && msLeft <= CLIENT_CONFIG.countdownShowMs ? Math.max(0, Math.ceil(msLeft / 1000)) : null;

  // One shot per turn: once sent, the cue stays drawn back where you let go until the shot comes back.
  const turnKey = `${party.startedAt}:${game.moves}`;
  const [sent, setSent] = useState<{ key: string; shot: PoolShot } | null>(null);
  const sentShot = sent?.key === turnKey ? sent.shot : null;
  const canShoot = myTurn && sentShot === null;
  const [aimed, setAimed] = useState<{ key: string; dx: number; dy: number } | null>(null);
  const cueBall = game.balls[0]!;
  const aim = aimed?.key === turnKey ? aimed : defaultAim(cueBall, !game.broken);
  // How to shoot shows until your first shot of the game.
  const [shotIn, setShotIn] = useState<number | null>(null);
  const shoot = (power: number) => {
    const shot = shotMove({ dx: aim.dx, dy: aim.dy, power });
    setSent({ key: turnKey, shot });
    setShotIn(party.startedAt);
    send({ type: "move", move: shot });
  };
  const { control, pull, twitch } = useCueControl({ cueBall, aim, onAim: (next) => setAimed({ key: turnKey, ...next }), onShoot: shoot });

  const winnerId = party.championIds[0] ?? null;
  const myResult = party.results.find((r) => r.id === myId);
  const tone = !over ? null : winnerId === myId ? "win" : myResult ? "lose" : "watch";
  const endingText = {
    win: "YOU WIN!",
    lose: `YOU'RE ${ordinal(myResult?.place ?? 0).toUpperCase()}`,
    watch: `${winnerId === null ? "NOBODY" : partyName(party, winnerId)} WINS!`,
  } as const;
  useAutoContinue(tone !== null, CLIENT_CONFIG.resultShowMs, onContinue);
  usePoolSounds({ playback, mySeat, myTurn: myTurn && !shootingAgain, countdown: myTurn ? countdown : null, ending: tone, gameKey: party.startedAt });

  // A shot has played out (or someone quit): a short notice in the status card.
  const [seen, setSeen] = useState({ key: party.startedAt, moves: game.moves, quits: game.quitOrder.length });
  const [notice, setNotice] = useState<{ text: string; id: number } | null>(null);
  if (!playing && (seen.key !== party.startedAt || seen.moves !== game.moves || seen.quits !== game.quitOrder.length)) {
    const sameGame = seen.key === party.startedAt;
    const quitter = sameGame && game.quitOrder.length > seen.quits ? party.entrants[game.quitOrder.at(-1)!]! : null;
    const text =
      sameGame && game.moves === seen.moves + 1 ? shotNotice(party, game, myId) : quitter && quitter.id !== myId ? `${quitter.name.toUpperCase()} QUIT` : null;
    setSeen({ key: party.startedAt, moves: game.moves, quits: game.quitOrder.length });
    if (text) setNotice({ text, id: game.moves * 100 + game.quitOrder.length });
  }
  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(null), CLIENT_CONFIG.toastDurationMs);
    return () => clearTimeout(timer);
  }, [notice]);

  // The table: every ball in its owner's color (yours with a white dot), the cue on a shot being struck or aimed.
  const paint: BallPaint = (owner: BallOwner) =>
    owner === "cue"
      ? { color: POOL_PAINT.cueBall, mine: false }
      : owner === "black"
        ? { color: POOL_PAINT.black, mine: false }
        : { color: ballColor(seatIds[owner]!), mine: owner === mySeat };
  const balls = sceneBalls(game.balls, playback, paint);
  const myColor = ballColor(myId);
  const cue = playback
    ? strikingCue(playback, ballColor(seatIds[playback.shot.seat]!))
    : sentShot
      ? aimedCue(cueBall, sentShot, sentShot.power, myColor)
      : canShoot
        ? aimedCue(cueBall, aim, pull ?? 0, myColor, twitch)
        : null;
  const tableLabel = party.entrants
    .flatMap((e, s) => (hasQuit(game, s) || isOut(game, s) ? [] : [`${e.name}: ${onTheBlack(game, s) ? "on the black" : `${ballsLeft(game, s)} left`}`]))
    .join("; ");

  const washId = over ? winnerId : turnId;
  const wash = washId === null ? PLAIN_PAGE : playerStyle(washId);
  const stripPlayers = party.entrants.map((e, s) => ({
    id: e.id,
    name: e.name,
    out: hasQuit(game, s) || outShown(s),
    quit: hasQuit(game, s),
    count: hasQuit(game, s) || outShown(s) ? null : ballsLeft(game, s),
  }));
  // What just happened (a foul, someone out) takes the card's second line for a moment: every message in one place.
  const detail =
    notice !== null
      ? notice.text
      : mySeat === null
      ? "Watching live"
      : outShown(mySeat)
        ? "You're out · watching"
        : canShoot && shotIn !== party.startedAt
          ? "Drag to aim · hold & pull back to shoot"
          : null;
  const turnName = turnId === null ? "" : partyName(party, turnId);
  const myText = shootingAgain ? "SHOOT AGAIN!" : mySeat !== null && onTheBlack(game, mySeat) ? "SINK THE BLACK!" : "YOUR SHOT!";
  const status =
    turnId === null ? null : (
      <PoolStatus
        text={turnId === myId ? myText : shootingAgain ? `${turnName} SHOOTS AGAIN` : `${possessive(turnName)} SHOT`}
        detail={detail}
        countdown={countdown}
      />
    );

  return (
    <ScreenLayout centered wide="full" wash={wash} onTap={tone !== null ? onContinue : undefined}>
      {/* In the corner whatever happens (no header bar appearing once you're out, so the table never changes size): ✕ while you're in, back once out or watching. */}
      {!over && (
        <div className="fixed top-4 left-4 z-raised">
          {stillIn ? <IconButton icon="close" label="Quit game" onClick={onQuit} /> : <IconButton icon="back" label="Leave room" onClick={onLeave} />}
        </div>
      )}
      <div
        className={clsx(
          "flex h-[calc(100dvh-2*var(--layout-gutter))] w-full flex-col items-stretch gap-2 landscape:flex-row landscape:items-center landscape:gap-6",
          // A finger held or dragged anywhere is part of your shot: never selecting text, scrolling or a copy bubble.
          "touch-none select-none no-callout",
          // Sideways, the table keeps clear of the corner button (in portrait the players' row sits beside it).
          "landscape:pl-[calc(var(--layout-icon-button)+var(--space-2))]",
        )}
      >
        {/* In portrait the table reaches into the screen's side margins: every pixel goes to the cloth. */}
        <div className="relative flex min-h-0 flex-1 self-stretch portrait:-mx-2" style={tone === "win" ? playerStyle(myId) : undefined}>
          <PoolTable balls={balls} cue={cue} portrait={portrait} control={canShoot ? control : undefined} label={tableLabel} />
        </div>
        <div className="flex flex-col items-stretch gap-3 portrait:contents landscape:w-party-side landscape:flex-none">
          {/* Always the same height in portrait, whatever it shows, so the table under it never changes size. */}
          <div className="flex flex-col items-stretch gap-1 portrait:order-first portrait:h-pool-top portrait:flex-none">
            {tone === null ? (
              <>
                {/* Only the players' row sits beside the corner ✕; the line under it has the whole width. */}
                <div className="portrait:px-[calc(var(--layout-icon-button)+var(--space-2))]">
                  <TurnStrip players={stripPlayers} activeIds={turnId === null ? [] : [turnId]} myId={myId} shape="disc" />
                </div>
                {status}
              </>
            ) : (
              <TurnBanner tone={tone} playerId={tone === "win" ? myId : (winnerId ?? myId)} text={endingText[tone]} />
            )}
          </div>
        </div>
      </div>
    </ScreenLayout>
  );
}
