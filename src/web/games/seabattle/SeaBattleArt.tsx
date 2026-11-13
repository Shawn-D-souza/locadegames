import { CELL_COUNT, SEABATTLE_CONFIG } from "../../../shared/games/seabattle/config";
import { shipCells, shipLength } from "../../../shared/games/seabattle/fleet";
import { MARK, type CellMark, type Ship } from "../../../shared/games/seabattle/types";
import { IronBall } from "./IronBall";
import { cellBox, shipBox } from "./seaGeometry";
import { ShipShape } from "./ShipShape";
import { tileLook } from "./tileLook";
import { WRECK_STYLE } from "./wreckStyle";

/**
 * A shot on its way, close up: a corner of the waters being fired at (about four tiles across, the rest running off
 * the edges), only a few things a player sees there (owner: ships afloat misled, the game never shows them; a crosshair
 * was too much): a cruiser already sunk, burnt black, two burnt tiles where another ship is being found, two misses on
 * the water, and a cannonball coming down just left of those hits, its shadow on that tile and a dashed arc
 * behind it (the path it came along). The game's own pieces, held still (the ball drawn bigger so it reads).
 */
const TILES_ACROSS = 4;
/** A cruiser already sunk, burnt, along the bottom (rows and columns 0–3 are in view). */
const SUNK: Ship = { cell: 25, vertical: false };
const SUNK_INDEX = 2;
const WRECKED = new Set(shipCells(SUNK, shipLength(SUNK_INDEX)));
const SHOTS: Partial<Record<number, CellMark>> = {
  10: MARK.hit,
  11: MARK.hit,
  25: MARK.hit,
  26: MARK.hit,
  27: MARK.hit,
  3: MARK.miss,
  19: MARK.miss,
};
const MARKS: CellMark[] = Array.from({ length: CELL_COUNT }, (_, cell) => SHOTS[cell] ?? MARK.none);
/** Where the ball is about to land: just left of the two hits, as a player would aim (its shadow is there). */
const TARGET = 9;
/**
 * Where the ball is against its shadow (of its own size): up and to the left, coming down at an angle, so its shadow
 * shows where it lands (straight over it, the ball hides it).
 */
const BALL_OFFSET = "-85% -105%";
/** The ball against a tile: bigger than in a match (a match's is half a tile), so it reads at a tile's size. */
const BALL_SHARE = 0.75;
/**
 * The path it came along: a dashed arc in the window's own units (0–100 across), up from the bottom left, over the
 * top and down into the ball, so it reads as falling onto its shadow.
 */
const TRAIL = "M -3 80 Q -1 0 18 12";
const TRAIL_LINE = 2.2;
const TRAIL_DASH = "5 5";

export function SeaBattleArt() {
  return (
    <div className="flex size-full items-center justify-center" aria-hidden="true">
      <div className="relative aspect-square w-full overflow-hidden rounded-art-cell border-thin border-ink bg-sea">
        <svg viewBox="0 0 100 100" className="absolute inset-0 z-raised size-full">
          <path d={TRAIL} fill="none" className="stroke-white opacity-secondary" strokeWidth={TRAIL_LINE} strokeDasharray={TRAIL_DASH} strokeLinecap="round" />
        </svg>
        {/* The whole board, zoomed so about four tiles fill the window: the tiles' sizes follow its width. */}
        <div className="@container absolute top-0 left-0" style={{ width: `${(SEABATTLE_CONFIG.boardSize / TILES_ACROSS) * 100}%` }}>
          <div className="relative grid w-full grid-cols-8 gap-(--sea-tile-gap) p-(--sea-tile-gap)">
            {MARKS.map((mark, cell) => (
              <span key={cell} className={`aspect-square rounded-(--sea-tile-radius) ${tileLook(mark, WRECKED.has(cell))}`} />
            ))}
            <div className="absolute inset-(--sea-tile-gap)">
              <span className="absolute" style={{ ...shipBox(SUNK, shipLength(SUNK_INDEX)), ...WRECK_STYLE }}>
                <ShipShape index={SUNK_INDEX} vertical={SUNK.vertical} className="size-full" />
              </span>
              {MARKS.map((mark, cell) =>
                mark === MARK.miss ? (
                  <span key={cell} className="absolute flex items-center justify-center" style={cellBox(cell)}>
                    <span className="size-1/2 rounded-pill border-thin border-white opacity-secondary" />
                  </span>
                ) : null,
              )}
              {/* In its arc as in a match (bigger, lifted), its shadow small and faint on the tile below. */}
              <span className="absolute z-raised flex items-center justify-center" style={cellBox(TARGET)}>
                <span className="absolute scale-(--transform-shot-shadow-scale) rounded-pill bg-ink opacity-closed-board" style={{ width: `${BALL_SHARE * 100}%`, height: `${BALL_SHARE * 100}%` }} />
                <IronBall
                  className="absolute scale-(--transform-shot-arc-scale) overflow-visible"
                  style={{ width: `${BALL_SHARE * 100}%`, height: `${BALL_SHARE * 100}%`, translate: BALL_OFFSET }}
                />
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
