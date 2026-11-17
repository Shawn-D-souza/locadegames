import { AbsoluteFill, Easing, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { GAMES } from "../../../src/shared/games/catalog";
import { GameTile } from "../../../src/web/components/GameTile";
import { SectionCard } from "../../../src/web/components/SectionCard";
import { GAME_LOOKS } from "../../../src/web/games/gameLooks";
import { orderGames } from "../../../src/web/utils/gameOrder";
import { PopText } from "../parts/PopText";
import { cue, seconds } from "../timing";

/**
 * The end of Act 3 (0:36–0:38): the room's whole games grid, out of the phone and onto the page: the app's GAMES card
 * pops on and its 15 tiles pop in after it, one after another, in the room's order for four friends. Then the line
 * PICK ANY GAME. PLAY TOGETHER. (owner: never a number, which sounds like a limit). It all pops off as Act 4's phones
 * fly back in. Frames count from the grid's cue.
 */

const ORDER = orderGames(GAMES, 4);
/** The app's card and tiles, drawn bigger (CSS zoom): five tiles across. */
const ZOOM = 1.45;
const COLUMNS = 5;
/** Everything pops off this long before the phones are back. */
const EXIT = seconds(0.65);
/** Each tile pops in this many frames after the one before. */
const STAGGER = 2;
const SPRING = { damping: 13, stiffness: 230, mass: 0.6 };

export function Act3Grid() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const card = spring({ frame, fps, config: SPRING });
  const text = cue("text15Games") - cue("gamesGrid");
  const exitAt = cue("backToPhones") - cue("gamesGrid") - EXIT;
  const exit = Easing.in(Easing.back(1.4))(interpolate(frame, [exitAt, exitAt + seconds(0.25)], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }));
  // The grid sits high, making room for the line under it once it comes.
  const lift = interpolate(spring({ frame: frame - text + 4, fps, config: SPRING }), [0, 1], [40, 0]);
  return (
    <AbsoluteFill>
      <AbsoluteFill style={{ alignItems: "center", paddingTop: 34 + lift }}>
        <div style={{ zoom: ZOOM, width: 168 * COLUMNS, transform: `scale(${Math.max(0, card * (1 - exit))}) rotate(${(1 - card) * 4 - exit * 6}deg)` }}>
          <SectionCard label="Games">
            <div className="grid w-full gap-4" style={{ gridTemplateColumns: `repeat(${COLUMNS}, 1fr)` }}>
              {ORDER.map((game, i) => {
                const pop = spring({ frame: frame - 3 - i * STAGGER, fps, config: SPRING });
                return (
                  <div key={game.id} style={{ transform: `scale(${pop}) rotate(${(1 - pop) * (i % 2 ? 8 : -8)}deg)` }}>
                    <GameTile game={game} look={GAME_LOOKS[game.id]} disabled={false} onPick={() => {}} />
                  </div>
                );
              })}
            </div>
          </SectionCard>
        </div>
      </AbsoluteFill>
      <PopText from={text} to={exitAt}>
        Pick any game. Play together.
      </PopText>
    </AbsoluteFill>
  );
}
