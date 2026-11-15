import { clsx } from "clsx";
import type { CSSProperties } from "react";
import { lineAt } from "../../../shared/games/dotsboxes/board";
import { boardUnit, boxStyle, dotStyle, lineStyle, targetStyle } from "./geometry";
import { LineTarget } from "./LineTarget";

interface BoxesBoardProps {
  size: number;
  drawn: readonly boolean[];
  boxes: readonly (number | null)[];
  /** The latest line, drawn in its drawer's colors until the next one. */
  last: { line: number; paint: CSSProperties } | null;
  /** A won box's colors (`playerStyle` of its winner, grey for a quitter). */
  paintOfBox(box: number): CSSProperties;
  /** Your turn: open lines take taps. */
  canDraw: boolean;
  /** Your colors, for the line you're about to draw. */
  youPaint: CSSProperties;
  /** A line's name for screen readers. */
  labelOfLine(line: number): string;
  /** The game just ended: the board thumps. */
  ended: boolean;
  onDraw(line: number): void;
}

/**
 * The board: a white card with a square of ink dots. Open lines show faintly; drawn ones are ink (the latest in its
 * drawer's color, so with 8 players you still see what just happened), drawing in from their middle. A won box fills
 * with its winner's color. Each open line's tap area is a diamond around it, so a finger takes the nearest line.
 */
export function BoxesBoard({ size, drawn, boxes, last, paintOfBox, canDraw, youPaint, labelOfLine, ended, onDraw }: BoxesBoardProps) {
  const corners = Array.from({ length: (size + 1) * (size + 1) }, (_, i) => i);
  return (
    <div
      className={clsx("@container relative aspect-square w-full rounded-card border-thin border-ink bg-white", ended && "animate-board-thump")}
      style={boardUnit(size)}
      role="group"
      aria-label="Board"
    >
      {boxes.map((owner, box) =>
        owner === null ? null : <span key={`box${box}`} className="absolute animate-box-claim bg-player" style={{ ...boxStyle(size, box), ...paintOfBox(box) }} />,
      )}
      {drawn.map((isDrawn, line) => {
        const horizontal = lineAt(size, line).horizontal;
        if (!isDrawn) return <span key={`open${line}`} className="absolute rounded-pill bg-tile-edge" style={lineStyle(size, line, false)} />;
        const latest = last?.line === line;
        return (
          <span
            key={`line${line}`}
            className={clsx(
              "absolute rounded-pill transition-colors duration-slow",
              horizontal ? "animate-edge-draw-x" : "animate-edge-draw-y",
              latest ? "bg-player" : "bg-ink",
            )}
            style={{ ...lineStyle(size, line, true), ...(latest ? last.paint : undefined) }}
          />
        );
      })}
      {corners.map((corner) => (
        <span key={`dot${corner}`} className="absolute rounded-pill bg-ink" style={dotStyle(Math.floor(corner / (size + 1)), corner % (size + 1))} />
      ))}
      {drawn.map((isDrawn, line) =>
        isDrawn ? null : (
          <LineTarget
            key={`tap${line}`}
            horizontal={lineAt(size, line).horizontal}
            style={{ ...targetStyle(size, line), ...youPaint }}
            enabled={canDraw}
            label={labelOfLine(line)}
            onDraw={() => onDraw(line)}
          />
        ),
      )}
    </div>
  );
}
