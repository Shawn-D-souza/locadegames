import { clsx } from "clsx";
import { useEffect, useState, type CSSProperties } from "react";
import { sideOf, strikerSpot } from "../../../shared/games/carrom/board";
import { CARROM_CONFIG } from "../../../shared/games/carrom/config";
import { applyMove, hasQuit, parseMove } from "../../../shared/games/carrom/rules";
import { partyDeadline } from "../../../shared/party/party";
import type { Party } from "../../../shared/party/types";
import type { RoomError } from "../../../shared/protocol/errors";
import type { ClientMessage } from "../../../shared/protocol/messages";
import type { PlayerId } from "../../../shared/rooms/types";
import { IconButton } from "../../components/IconButton";
import { ScreenLayout } from "../../components/ScreenLayout";
import { StatusCard } from "../../components/StatusCard";
import { TurnBanner } from "../../components/TurnBanner";
import { TurnStrip } from "../../components/TurnStrip";
import { CLIENT_CONFIG } from "../../config";
import { useAutoContinue } from "../../hooks/useAutoContinue";
import { useNow } from "../../hooks/useNow";
import { ordinal } from "../../utils/arenaText";
import { partyName, possessive } from "../../utils/partyText";
import { playerStyle } from "../../utils/playerStyle";
import { joinNames } from "../../utils/tournamentText";
import { sceneDiscs } from "./boardScene";
import { CarromBoard } from "./CarromBoard";
import { shotMove } from "./loadedShots";
import { strikerColor } from "./look";
import { shotNotice } from "./shotNotice";
import { nearestFit, type Aim } from "./strikerGrip";
import { useCarromSounds } from "./useCarromSounds";
import { useShotPlayback, type LocalShot } from "./useShotPlayback";
import { useStrikerControl } from "./useStrikerControl";

/** The screen while nobody's turn shows (between games): plain. */
const PLAIN_PAGE = { "--player-wash": "var(--color-board-page)" } as CSSProperties;
/** A refusal from the server that means it didn't take your shot. */
const SHOT_REFUSED: readonly RoomError[] = ["NOT_YOUR_TURN", "GAME_OVER", "INVALID_MOVE"];

interface CarromScreenProps {
  party: Party<"carrom">;
  myId: PlayerId;
  clockOffsetMs: number;
  send(message: ClientMessage): void;
  /** The server's latest refusal: if it was your shot's, the board goes back to the server's. */
  lastError: { error: RoomError; id: number } | null;
  /** Still in: the corner ✕ (the room asks first). */
  onQuit(): void;
  /** Quit or watching: the back arrow leaves the room. */
  onLeave(): void;
  /** The ending has shown (or was tapped away): on to the results. */
  onContinue(): void;
}

/**
 * Carrom: point carrom on one board for 2–4, each from their own side, the board turned so yours is at the bottom.
 * Above it everyone in turn order with their points, and one line saying whose shot it is (the ending's result there
 * too). Your shot, like flicking a real striker: slide it along your baseline, then pull back from it in any direction
 * and let go; it shoots the opposite way. It plays the moment you let go (owner direction); everyone else's phone plays
 * it as it arrives and catches up. No arrow, no aim line. The game ends once every coin is in; then the results by
 * themselves.
 */
export function CarromScreen({ party, myId, clockOffsetMs, send, lastError, onQuit, onLeave, onContinue }: CarromScreenProps) {
  const game = party.game;
  const gameKey = party.startedAt;
  const seatIds = party.entrants.map((e) => e.id);
  const seat = seatIds.indexOf(myId);
  const mySeat = seat === -1 ? null : seat;
  const mySide = mySeat === null ? 0 : sideOf(game.players, mySeat);

  // Your shot as this phone worked it out, until the server's copy comes back (or it refuses it).
  const [local, setLocal] = useState<(LocalShot & { refused: boolean }) | null>(null);
  const localNow = local && local.gameKey === gameKey && local.from === game.moves && !local.refused ? local : null;
  const [seenError, setSeenError] = useState(lastError);
  if (lastError !== seenError) {
    setSeenError(lastError);
    if (lastError && SHOT_REFUSED.includes(lastError.error) && local && !local.refused) setLocal({ ...local, refused: true });
  }
  const shown = localNow ? localNow.state : game;

  const playback = useShotPlayback(game, gameKey, party.turnStartedAt, clockOffsetMs, localNow);
  const playing = playback !== null;
  const shooting = playback?.shot ?? null;
  const over = party.finished && !playing;
  const stillIn = mySeat !== null && !over && !hasQuit(game, mySeat);
  const now = useNow(CLIENT_CONFIG.timerTickMs, !party.finished);

  const turnSeat = shooting ? shooting.seat : shown.turn;
  const turnId = over || turnSeat < 0 ? null : (seatIds[turnSeat] ?? null);
  const myTurn = !playing && !localNow && !party.finished && turnId === myId;
  const shootingAgain = !playing && shown.last?.kind === "shot" && shown.last.again && shown.last.seat === shown.turn;
  const covering = !playing && shown.queenDue !== null && shown.queenDue === shown.turn;
  const msLeft = partyDeadline(party) - clockOffsetMs - now;
  const countdown = !playing && !localNow && turnId !== null && msLeft <= CLIENT_CONFIG.countdownShowMs ? Math.max(0, Math.ceil(msLeft / 1000)) : null;

  // Your striker this turn: in the middle of your baseline (or the nearest place it fits) until you slide it.
  const turnKey = `${gameKey}:${game.moves}`;
  const [placed, setPlaced] = useState<{ key: string; at: number } | null>(null);
  const at = placed?.key === turnKey ? placed.at : (nearestFit(shown.coins, mySide, 0) ?? 0);
  const striker = strikerSpot(mySide, at);
  // How to shoot shows until your first shot of the game.
  const [shotIn, setShotIn] = useState<number | null>(null);
  const shoot = (aim: Aim, power: number, letGoAt: number) => {
    if (mySeat === null) return;
    const raw = shotMove({ at, dx: aim.dx, dy: aim.dy, power });
    const move = parseMove(raw, import.meta.env.DEV);
    const result = move && applyMove(game, mySeat, move);
    if (!result?.ok) return;
    setLocal({ gameKey, from: game.moves, state: result.state, startedAt: letGoAt, refused: false });
    setShotIn(gameKey);
    send({ type: "move", move: raw });
  };
  const { control, pull } = useStrikerControl({
    coins: shown.coins,
    side: mySide,
    striker,
    onPlace: (next) => setPlaced({ key: turnKey, at: next }),
    onShoot: shoot,
  });

  const winnerIds = party.championIds;
  const myResult = party.results.find((r) => r.id === myId);
  const tone = !over ? null : winnerIds.includes(myId) ? "win" : myResult ? "lose" : "watch";
  const endingText = {
    win: winnerIds.length > 1 ? "SHARED WIN!" : "YOU WIN!",
    lose: `YOU'RE ${ordinal(myResult?.place ?? 0).toUpperCase()}`,
    watch: winnerIds.length === 0 ? "NOBODY WINS!" : `${joinNames(winnerIds.map((id) => partyName(party, id))).toUpperCase()} ${winnerIds.length > 1 ? "WIN" : "WINS"}!`,
  } as const;
  useAutoContinue(tone !== null, CLIENT_CONFIG.resultShowMs, onContinue);
  useCarromSounds({ playback, mySeat, myTurn: myTurn && !shootingAgain, countdown: myTurn ? countdown : null, ending: tone, gameKey });

  // A shot has played out (or someone quit): a short notice in the status card.
  const [seen, setSeen] = useState({ key: gameKey, moves: game.moves, quits: game.quitOrder.length });
  const [notice, setNotice] = useState<{ text: string; id: number } | null>(null);
  if (!playing && !localNow && (seen.key !== gameKey || seen.moves !== game.moves || seen.quits !== game.quitOrder.length)) {
    const sameGame = seen.key === gameKey;
    const quitter = sameGame && game.quitOrder.length > seen.quits ? party.entrants[game.quitOrder.at(-1)!]! : null;
    const text = sameGame && game.moves === seen.moves + 1 ? shotNotice(party, game, myId) : quitter && quitter.id !== myId ? `${quitter.name.toUpperCase()} QUIT` : null;
    setSeen({ key: gameKey, moves: game.moves, quits: game.quitOrder.length });
    if (text) setNotice({ text, id: game.moves * 100 + game.quitOrder.length });
  }
  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(null), CLIENT_CONFIG.toastDurationMs);
    return () => clearTimeout(timer);
  }, [notice]);

  // While a shot plays, the points stay as they were before it.
  const scores = shown.scores.map((s, i) => (shooting && shooting.seat === i ? s - shooting.points : s));
  const canShoot = myTurn && stillIn;
  const discs = sceneDiscs(shown.coins, playback, canShoot ? striker : null, CARROM_CONFIG.settleMs);
  const discColor = strikerColor(shooting ? seatIds[shooting.seat]! : myId);
  const boardLabel = party.entrants.map((e, s) => `${e.name}: ${scores[s]} points${hasQuit(game, s) ? " (quit)" : ""}`).join("; ");

  const washId = over ? (winnerIds.length === 1 ? winnerIds[0]! : null) : turnId;
  const wash = washId === null ? PLAIN_PAGE : playerStyle(washId);
  const stripPlayers = party.entrants.map((e, s) => ({ id: e.id, name: e.name, out: hasQuit(game, s), quit: hasQuit(game, s), score: scores[s]! }));
  // What just happened (points, the queen, a foul) takes the card's second line for a moment: every message in one place.
  const detail =
    notice !== null
      ? notice.text
      : mySeat === null
        ? "Watching live"
        : !stillIn && !over
          ? "You quit · watching"
          : canShoot && shotIn !== gameKey
            ? "Slide · pull back any way · let go"
            : null;
  const turnName = turnId === null ? "" : partyName(party, turnId);
  const myText = covering ? "COVER THE QUEEN!" : shootingAgain ? "SHOOT AGAIN!" : "YOUR SHOT!";
  const theirText = covering ? `${turnName} TO COVER THE QUEEN` : shootingAgain ? `${turnName} SHOOTS AGAIN` : `${possessive(turnName)} SHOT`;
  const status = turnId === null ? null : <StatusCard text={turnId === myId ? myText : theirText} detail={detail} countdown={countdown} />;

  return (
    <ScreenLayout centered wide="full" wash={wash} onTap={tone !== null ? onContinue : undefined}>
      {/* In the corner whatever happens (no header bar appearing, so the board never changes size): ✕ while you're in, back once quit or watching. */}
      {!over && (
        <div className="fixed top-4 left-4 z-raised">
          {stillIn ? <IconButton icon="close" label="Quit game" onClick={onQuit} /> : <IconButton icon="back" label="Leave room" onClick={onLeave} />}
        </div>
      )}
      <div
        className={clsx(
          "flex h-[calc(100dvh-2*var(--layout-gutter))] w-full flex-col items-stretch justify-center gap-2 landscape:flex-row landscape:items-center landscape:gap-6",
          // A finger held or dragged anywhere is part of your shot: never selecting text, scrolling or a copy bubble.
          "touch-none select-none no-callout",
          // Sideways, the board keeps clear of the corner button (in portrait the players' row sits beside it).
          "landscape:pl-[calc(var(--layout-icon-button)+var(--space-2))]",
        )}
      >
        {/* In portrait the board reaches into the screen's side margins (every pixel goes to it), square, right under the players' row, the two together in the middle of the screen. */}
        <div className="relative flex min-h-0 flex-1 self-stretch portrait:-mx-2 portrait:aspect-square portrait:flex-initial">
          <CarromBoard
            discs={discs}
            strikerColor={discColor}
            striker={canShoot ? striker : null}
            pull={canShoot ? pull : null}
            side={mySide}
            control={canShoot ? control : undefined}
            label={boardLabel}
          />
        </div>
        <div className="flex flex-col items-stretch gap-3 portrait:contents landscape:w-party-side landscape:flex-none">
          {/* Always the same height in portrait, whatever it shows, so the board under it never changes size. */}
          <div className="flex flex-col items-stretch gap-1 portrait:order-first portrait:h-carrom-top portrait:flex-none">
            {tone === null ? (
              <>
                {/* Only the players' row sits beside the corner ✕; the line under it has the whole width. */}
                <div className="portrait:px-[calc(var(--layout-icon-button)+var(--space-2))]">
                  <TurnStrip players={stripPlayers} activeIds={turnId === null ? [] : [turnId]} myId={myId} shape="disc" />
                </div>
                {status}
              </>
            ) : (
              <TurnBanner tone={tone} playerId={tone === "win" ? myId : (winnerIds[0] ?? myId)} text={endingText[tone]} />
            )}
          </div>
        </div>
      </div>
    </ScreenLayout>
  );
}
