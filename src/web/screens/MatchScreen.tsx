import { clsx } from "clsx";
import { useRef } from "react";
import type { Seat } from "../../shared/games/types";
import type { ClientMessage, RoomView } from "../../shared/protocol/messages";
import type { PlayerId } from "../../shared/rooms/types";
import { isLive, turnDeadline } from "../../shared/tournament/tournament";
import { TOURNAMENT_CONFIG } from "../../shared/tournament/config";
import type { Match, Tournament } from "../../shared/tournament/types";
import { Badge } from "../components/Badge";
import type { BoardEnding } from "../components/BoardFrame";
import { Header } from "../components/Header";
import { IconButton } from "../components/IconButton";
import { PillButton } from "../components/PillButton";
import { ScreenLayout } from "../components/ScreenLayout";
import { SeatCard } from "../components/SeatCard";
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
  match: Match;
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
};

/** One 1v1 match: both players side by side (you on the left; the lit card is whose turn, then the winner), then the board. Also used to watch others. */
export function MatchScreen({ room, tournament, match, myId, clockOffsetMs, send, onBack, onContinue, onQuit }: MatchScreenProps) {
  const boardRef = useRef<HTMLDivElement>(null);
  const look = MATCH_LOOKS[tournament.gameId];
  const layout = LAYOUT_CLASSES[look.layout];
  const live = isLive(match);
  const now = useNow(CLIENT_CONFIG.timerTickMs, live);
  const drawn = match.result === "draw";
  const mySeat = match.players.indexOf(myId);
  const watching = mySeat === -1;
  // You are always the left card; watchers see the higher seed on the left.
  const leftSeat: Seat = watching ? 0 : (mySeat as Seat);
  const rightSeat: Seat = leftSeat === 0 ? 1 : 0;
  const turnId = match.players[match.game.turn];
  const msLeft = turnDeadline(tournament, match) - clockOffsetMs - now;
  const countdown = live && msLeft <= CLIENT_CONFIG.countdownShowMs ? Math.max(0, Math.ceil(msLeft / 1000)) : null;
  const leaver = match.result === "forfeit" ? match.players.find((id) => id !== match.winner)! : null;
  const ending: Ending | null = live ? null : drawn ? "draw" : match.winner === myId ? "win" : watching ? "watch" : "lose";
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
  useAutoContinue(!live, CLIENT_CONFIG.resultShowMs, onContinue);
  useMatchSounds({
    matchKey: `${tournament.startedAt}:${match.id}`,
    game: match.game,
    look,
    ending,
    leaver,
    yourTurn: live && turnId === myId,
    viewer: watching ? null : (mySeat as Seat),
    countdown: live && turnId === myId ? countdown : null,
  });

  // The pieces on the cards react on your phone: your X or O jumps for joy or droops; a draw makes both shrug.
  const pieceMotion = (id: PlayerId) =>
    ending === "draw" && !watching ? "shrug" : id !== myId ? null : ending === "win" ? "hop" : ending === "lose" ? "droop" : null;

  const card = (seat: Seat) => {
    const id = match.players[seat];
    const player = room.players.find((p) => p.id === id);
    // Live: whose turn. Over: the winner (nobody after a draw).
    const active = live ? id === turnId : id === match.winner;
    return (
      <SeatCard
        player={{ id, name: entrantName(tournament, id), connected: player?.connected ?? false }}
        seat={seat}
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
  const watchingLive = live && watching && onBack;
  const footer = watchingLive ? (
      <PillButton fullWidth variant="deep" onClick={onBack}>
        BACK TO SCORES
      </PillButton>
    ) : undefined;

  return (
    // A draw has no color: the plain dot grid says nobody won.
    <ScreenLayout
      centered
      header={watchingLive ? <Header onBack={onBack} backLabel="Back to scores" /> : undefined}
      footer={footer}
      wash={drawn ? undefined : playerStyle(live ? turnId : match.winner!)}
      wide={look.layout === "largeBoard"}
      onTap={!live ? onContinue : undefined}
    >
      {ending === "win" && (
        <WinParticles
          board={boardRef}
          line={match.game.winningLine}
          colorId={myId}
          lineAt={CELEBRATION_TIMING.lineAt}
          celebrateAt={CELEBRATION_TIMING.celebrateAt}
        />
      )}
      {live && onQuit && (
        <div className="fixed top-4 left-4">
          <IconButton icon="close" label="Quit match" onClick={onQuit} />
        </div>
      )}
      {/* Players keep room under the corner ✕ in portrait (on a small phone it would sit on their card), for the whole match so nothing moves when it goes. */}
      <div className={clsx("isolate flex w-full items-stretch gap-4", layout.column, !watching && "portrait:pt-[calc(var(--layout-icon-button)+var(--space-1))]")}>
        <div className={clsx("flex flex-col items-stretch gap-4", layout.side)}>
          {watchingLive && (
            <Badge tone="ink" className="self-center">
              <span className="size-2 animate-live rounded-pill bg-coral" />
              WATCHING LIVE
            </Badge>
          )}
          <div className={clsx("grid gap-3", layout.cards)}>
            {card(leftSeat)}
            {card(rightSeat)}
          </div>
        </div>
        {/* Your win: sun rays turn behind the board and the cards, in your color (the column is its own stacking layer). */}
        <div className={clsx("relative", layout.board)} style={ending === "win" ? playerStyle(myId) : undefined}>
          {ending === "win" && <SunRays />}
          <look.Board
            ref={boardRef}
            game={match.game}
            seatColors={match.players}
            playableSeat={live && !watching ? (mySeat as Seat) : null}
            celebrate={ending === "win"}
            ending={boardEnding}
            tagLandsAtMs={CELEBRATION_TIMING.celebrateAt}
            onPlay={(move) => send({ type: "move", move })}
          />
        </div>
      </div>
    </ScreenLayout>
  );
}
