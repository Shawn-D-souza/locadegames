import { clsx } from "clsx";
import { useCallback, useEffect, useRef, useState } from "react";
import type { Seat } from "../../shared/games/types";
import type { ClientMessage, RoomView } from "../../shared/protocol/messages";
import type { PlayerId } from "../../shared/rooms/types";
import { isLive, turnDeadline } from "../../shared/tournament/tournament";
import { TOURNAMENT_CONFIG } from "../../shared/tournament/config";
import type { TurnGameId } from "../../shared/games/catalog";
import type { Tournament, TurnMatch } from "../../shared/tournament/types";
import { Badge } from "../components/Badge";
import type { BoardEnding } from "../components/BoardFrame";
import { Header } from "../components/Header";
import { IconButton } from "../components/IconButton";
import { PillButton } from "../components/PillButton";
import { ScreenLayout } from "../components/ScreenLayout";
import { SeatCard } from "../components/SeatCard";
import { SeatChip } from "../components/SeatChip";
import { SunRays } from "../components/SunRays";
import { WinParticles } from "../components/WinParticles";
import { CLIENT_CONFIG } from "../config";
import type { MatchLayout } from "../games/matchLook";
import { MATCH_LOOKS } from "../games/matchLooks";
import { useAutoContinue } from "../hooks/useAutoContinue";
import { useMatchSounds } from "../hooks/useMatchSounds";
import { useNow } from "../hooks/useNow";
import { CELEBRATION_TIMING } from "../utils/celebrationTiming";
import { playerStyle } from "../utils/playerStyle";
import { entrantName } from "../utils/tournamentText";

interface MatchScreenProps {
  room: RoomView;
  tournament: Tournament;
  /** The turn-based game being played (real-time games have their own screens). */
  gameId: TurnGameId;
  match: TurnMatch;
  myId: PlayerId;
  clockOffsetMs: number;
  send(message: ClientMessage): void;
  /** Watchers only: back to the points table (top arrow and bottom button). Players get no header, so nothing distracts from the board. */
  onBack?: () => void;
  /** Called once the match is over and its result has been shown (or on a tap). */
  onContinue?: () => void;
  /** Your own live match: a small ✕ in the corner to quit (the room asks first). */
  onQuit?: () => void;
}

/** How a finished match ended for whoever is looking at it; each gets its own ending. */
type Ending = "win" | "lose" | "draw" | "watch";

/**
 * How wide the column gets for the game's board. A board of small boards gets more room, and in landscape it sits
 * beside the seat cards (stacked), sized to the screen's height so all of it shows.
 */
const LAYOUT_CLASSES: Record<MatchLayout, { column: string; side: string; cards: string; board: string }> = {
  board: { column: "max-w-board flex-col", side: "", cards: "grid-cols-2", board: "" },
  largeBoard: {
    column: "max-w-board-large flex-col landscape:max-w-content-wide landscape:flex-row landscape:items-center landscape:justify-center",
    side: "landscape:w-board-side landscape:flex-none",
    cards: "grid-cols-2 landscape:grid-cols-1",
    board: "landscape:w-[min(var(--layout-board-wide),calc(100dvh-var(--layout-board-reserve)))] landscape:min-w-0 landscape:flex-initial",
  },
  // Two boards (Sea Battle): the slim chips in a row on top, the boards under them sizing themselves to the screen.
  // Two boards: the chips on top, the boards centered in the height left (owner: room to breathe, not packed at the top).
  twoBoards: { column: "max-w-board-large flex-1 flex-col landscape:max-w-content-wide", side: "", cards: "grid-cols-2", board: "flex flex-1 flex-col justify-center" },
};

/** One 1v1 match: both players side by side (you on the left; the lit card is whose turn, then the winner), then the board. Also used to watch others. */
export function MatchScreen({ room, tournament, gameId, match, myId, clockOffsetMs, send, onBack, onContinue, onQuit }: MatchScreenProps) {
  const boardRef = useRef<HTMLDivElement>(null);
  const look = MATCH_LOOKS[gameId];
  const layout = LAYOUT_CLASSES[look.layout];
  const live = isLive(match);
  const now = useNow(CLIENT_CONFIG.timerTickMs, live);
  const drawn = match.result === "draw";
  const mySeat = match.players.indexOf(myId);
  const watching = mySeat === -1;
  // You are always the left card; watchers see the higher seed on the left.
  const leftSeat: Seat = watching ? 0 : (mySeat as Seat);
  const rightSeat: Seat = leftSeat === 0 ? 1 : 0;
  // Who must act now: one player, or both at once (Sea Battle's placing). Their cards are lit, and the screen takes
  // their wash (both acting: yours if you're one of them).
  // A board that plays moves out (Sea Battle) says who must act as it shows it; the others act on the game as it is.
  const [shownToMove, setShownToMove] = useState<{ key: string; seats: readonly Seat[] } | null>(null);
  const matchKey = `${tournament.startedAt}:${match.id}`;
  const showToMove = useCallback(
    (seats: readonly Seat[]) =>
      setShownToMove((shown) => (shown?.key === matchKey && shown.seats.join() === seats.join() ? shown : { key: matchKey, seats })),
    [matchKey],
  );
  // A match that ends by a move, on a board that plays moves out (Sea Battle's last ball), still looks live until the
  // board has shown that move: the ending waits for it (never longer than `lastMoveWaitMs`).
  const [seenLive, setSeenLive] = useState({ key: matchKey, live });
  const [holding, setHolding] = useState<string | null>(null);
  if (seenLive.key !== matchKey || seenLive.live !== live) {
    setSeenLive({ key: matchKey, live });
    if (seenLive.key === matchKey && seenLive.live && !live && look.playsMovesOut && match.result !== "forfeit") setHolding(matchKey);
  }
  const lastMoveShown = useCallback(() => setHolding((key) => (key === matchKey ? null : key)), [matchKey]);
  const finishing = !live && holding === matchKey;
  useEffect(() => {
    if (!finishing) return;
    const timer = setTimeout(lastMoveShown, CLIENT_CONFIG.lastMoveWaitMs);
    return () => clearTimeout(timer);
  }, [finishing, lastMoveShown]);
  const looksLive = live || finishing;
  const seatsToMove = shownToMove?.key === matchKey ? shownToMove.seats : look.toMove(match.game);
  const toMove = seatsToMove.map((seat) => match.players[seat]);
  const turnId = toMove.includes(myId) ? myId : (toMove[0] ?? null);
  const turnEndsAt = turnDeadline(tournament, match) - clockOffsetMs;
  const msLeft = turnEndsAt - now;
  const countdown = live && msLeft <= CLIENT_CONFIG.countdownShowMs ? Math.max(0, Math.ceil(msLeft / 1000)) : null;
  const leaver = match.result === "forfeit" ? match.players.find((id) => id !== match.winner)! : null;
  const ending: Ending | null = looksLive ? null : drawn ? "draw" : match.winner === myId ? "win" : watching ? "watch" : "lose";
  const endingText: Record<Ending, string> = {
    win: "YOU WIN!",
    lose: "YOU LOST",
    draw: "DRAW!",
    watch: `${entrantName(tournament, match.winner ?? match.players[0])} WINS!`,
  };
  // Points this result earned you, in a tournament (a one-match game has no table, so no points).
  const myPoints =
    ending === null || ending === "watch" || tournament.totalRounds === 1
      ? null
      : drawn
        ? TOURNAMENT_CONFIG.drawPoints
        : ending === "win"
          ? TOURNAMENT_CONFIG.winPoints
          : 0;
  const boardEnding: BoardEnding | null = ending && {
    tone: ending,
    label: endingText[ending],
    points: myPoints,
    detail: leaver !== null ? `${entrantName(tournament, leaver)} quit` : null,
    winnerId: match.winner,
  };
  // The result stays a moment, then the room moves on; a tap anywhere skips the wait.
  useAutoContinue(!looksLive, CLIENT_CONFIG.resultShowMs, onContinue);
  useMatchSounds({
    matchKey,
    game: match.game,
    look,
    ending,
    leaver,
    yourTurn: live && toMove.includes(myId),
    viewer: watching ? null : (mySeat as Seat),
    countdown: live && toMove.includes(myId) ? countdown : null,
  });

  // The pieces on the cards react on your phone: your X or O jumps for joy or droops; a draw makes both shrug.
  const pieceMotion = (id: PlayerId) =>
    ending === "draw" && !watching ? "shrug" : id !== myId ? null : ending === "win" ? "hop" : ending === "lose" ? "droop" : null;

  const card = (seat: Seat) => {
    const id = match.players[seat];
    const player = room.players.find((p) => p.id === id);
    // Live: who must act. Over: the winner (nobody after a draw).
    const active = looksLive ? toMove.includes(id) : id === match.winner;
    const seated = { id, name: entrantName(tournament, id), connected: player?.connected ?? false };
    if (look.cards === "slim") {
      return (
        <SeatChip
          player={seated}
          isYou={id === myId}
          active={active}
          countdown={live && active ? countdown : null}
          celebrate={ending === "win" && id === myId}
          defeated={ending === "lose" && id === myId}
        />
      );
    }
    return (
      <SeatCard
        player={seated}
        seat={look.pieces ? seat : undefined}
        isYou={id === myId}
        active={active}
        countdown={live && active ? countdown : null}
        celebrate={ending === "win" && id === myId}
        defeated={ending === "lose" && id === myId}
        pieceMotion={pieceMotion(id)}
      />
    );
  };

  // Watching someone else's live match: back + settings on top, a WATCHING LIVE badge over the cards, BACK TO SCORES at the bottom.
  const watchingLive = looksLive && watching && onBack;
  const footer = watchingLive ? (
      <PillButton fullWidth variant="deep" onClick={onBack}>
        BACK TO SCORES
      </PillButton>
    ) : undefined;

  return (
    // A draw has no color: the plain dot grid says nobody won.
    // Slim chips start at the top, beside the corner ✕, so a tall board gets the screen's height.
    <ScreenLayout
      centered={look.cards === "full"}
      header={watchingLive ? <Header onBack={onBack} backLabel="Back to scores" /> : undefined}
      footer={footer}
      wash={(drawn && !looksLive) || (looksLive && turnId === null) ? undefined : playerStyle(looksLive ? turnId! : match.winner!)}
      wide={look.layout !== "board"}
      onTap={!looksLive ? onContinue : undefined}
    >
      {ending === "win" && (
        <WinParticles
          board={boardRef}
          line={look.winningLine(match.game)}
          colorId={myId}
          lineAt={CELEBRATION_TIMING.lineAt}
          celebrateAt={CELEBRATION_TIMING.celebrateAt}
        />
      )}
      {/* Above the match column, which a tall board (Sea Battle) stretches up under it. */}
      {live && onQuit && (
        <div className="fixed top-4 left-4 z-raised">
          <IconButton icon="close" label="Quit match" onClick={onQuit} />
        </div>
      )}
      {/* Players keep room under the corner ✕ in portrait (on a small phone it would sit on their card), for the whole match so nothing moves when it goes. */}
      <div
        className={clsx(
          "isolate flex w-full items-stretch gap-4",
          layout.column,
          !watching && look.cards === "full" && "portrait:pt-[calc(var(--layout-icon-button)+var(--space-1))]",
        )}
      >
        <div className={clsx("flex flex-col items-stretch gap-4", layout.side)}>
          {watchingLive && (
            <Badge tone="ink" className="self-center">
              <span className="size-2 animate-live rounded-pill bg-coral" />
              WATCHING LIVE
            </Badge>
          )}
          {/* Slim chips share the top row with the corner ✕ (players), so the board gets the height. */}
          <div className={clsx("grid gap-3", layout.cards, look.cards === "slim" && !watching && "pl-[calc(var(--layout-icon-button)+var(--space-2))]")}>
            {card(leftSeat)}
            {card(rightSeat)}
          </div>
        </div>
        {/* Your win: sun rays turn behind the board and the cards, in your color (the column is its own stacking layer). */}
        <div className={clsx("relative", layout.board)} style={ending === "win" ? playerStyle(myId) : undefined}>
          {ending === "win" && <SunRays />}
          <look.Board
            // A fresh board per match, so nothing it keeps (Sea Battle's fleet being placed) carries over.
            key={matchKey}
            ref={boardRef}
            game={match.game}
            seatColors={match.players}
            seatNames={[entrantName(tournament, match.players[0]), entrantName(tournament, match.players[1])]}
            playableSeat={live && !watching ? (mySeat as Seat) : null}
            viewerSeat={watching ? null : (mySeat as Seat)}
            turnEndsAt={turnEndsAt}
            celebrate={ending === "win"}
            ending={boardEnding}
            tagLandsAtMs={CELEBRATION_TIMING.celebrateAt}
            onPlay={(move) => send({ type: "move", move })}
            onShownToMove={showToMove}
            onLastMoveShown={lastMoveShown}
          />
        </div>
      </div>
    </ScreenLayout>
  );
}
