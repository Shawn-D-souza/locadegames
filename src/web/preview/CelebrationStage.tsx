import { useRef, type ReactNode } from "react";
import type { TicTacToeState } from "../../shared/games/tictactoe/types";
import { playerColors } from "../../theme";
import { Board, type BoardEnding } from "../components/Board";
import { ScreenLayout } from "../components/ScreenLayout";
import { SeatCard } from "../components/SeatCard";
import { SunRays } from "../components/SunRays";
import { WinParticles } from "../components/WinParticles";
import { CELEBRATION_TIMING } from "../utils/celebrationTiming";
import { playerStyle } from "../utils/playerStyle";
import type { CelebrationStyle } from "./celebrationStyles";

export type Outcome = "win" | "lose" | "draw";

/** Finished boards as they are the moment the match ends. You are X (seat 0). */
const BOARDS: Record<Outcome, TicTacToeState> = {
  win: { board: [0, 0, 0, 1, 1, null, null, null, null], turn: 1, winner: 0, winningLine: [0, 1, 2], isDraw: false, lastMove: 2 },
  lose: { board: [0, 0, null, 1, 1, 1, 0, null, null], turn: 0, winner: 1, winningLine: [3, 4, 5], isDraw: false, lastMove: 5 },
  draw: { board: [0, 1, 0, 0, 1, 1, 1, 0, 0], turn: 1, winner: null, winningLine: null, isDraw: true, lastMove: 8 },
};

const ENDINGS: Record<Outcome, { tone: BoardEnding["tone"]; label: string; points: number }> = {
  win: { tone: "win", label: "YOU WIN!", points: 2 },
  lose: { tone: "lose", label: "YOU LOST", points: 0 },
  draw: { tone: "draw", label: "DRAW!", points: 1 },
};

interface CelebrationStageProps {
  look: CelebrationStyle;
  outcome: Outcome;
  /** Your player color; the opponent takes another one. */
  colorId: number;
  controls: ReactNode;
}

/** A finished match on the real match-screen pieces, playing one celebration style from its first frame. */
export function CelebrationStage({ look, outcome, colorId, controls }: CelebrationStageProps) {
  const boardRef = useRef<HTMLDivElement>(null);
  const opponentId = (colorId + playerColors.length / 2) % playerColors.length;
  const seats = [colorId, opponentId] as const;
  const game = BOARDS[outcome];
  const winnerId = game.winner === null ? null : seats[game.winner];

  const pieceMotion = (id: number) => {
    if (!look.pieceMotion) return null;
    if (outcome === "draw") return "shrug";
    if (id !== colorId) return null;
    return outcome === "win" ? "hop" : "droop";
  };
  const card = (seat: 0 | 1) => {
    const id = seats[seat];
    return (
      <SeatCard
        player={{ id, name: id === colorId ? "You" : "Ana", connected: true }}
        seat={seat}
        isYou={id === colorId}
        active={id === winnerId}
        countdown={null}
        celebrate={outcome === "win" && id === colorId}
        defeated={outcome === "lose" && id === colorId}
        pieceMotion={pieceMotion(id)}
      />
    );
  };

  const ending = ENDINGS[outcome];
  return (
    <ScreenLayout centered header={controls} wash={winnerId === null ? undefined : playerStyle(winnerId)}>
      <div className="isolate flex w-full max-w-board flex-col items-stretch gap-4">
        <div className="grid grid-cols-2 gap-3">
          {card(0)}
          {card(1)}
        </div>
        <div className="relative" style={winnerId === null ? undefined : playerStyle(winnerId)}>
          {look.rays && outcome === "win" && <SunRays />}
          <Board
            ref={boardRef}
            game={game}
            seatColors={seats}
            playableSeat={null}
            celebrate={outcome === "win"}
            ending={{ ...ending, detail: null, winnerId }}
            markMotion={look.markMotion}
            countUp={look.countUp}
            tagLandsAtMs={CELEBRATION_TIMING.celebrateAt}
          />
        </div>
      </div>
      {outcome === "win" && (look.sparks || look.stars || look.confetti) && (
        <WinParticles
          board={boardRef}
          line={game.winningLine}
          colorId={colorId}
          lineAt={CELEBRATION_TIMING.lineAt}
          celebrateAt={CELEBRATION_TIMING.celebrateAt}
          sparks={look.sparks}
          stars={look.stars}
          confetti={look.confetti}
        />
      )}
      </ScreenLayout>
  );
}
