import { useRef, type CSSProperties } from "react";
import type { Arena } from "../../../../shared/arena/types";
import type { PlayerId } from "../../../../shared/rooms/types";
import { colors, getPlayerColor } from "../../../../theme";
import { Particles } from "../../../components/Particles";
import { ResultTag, type ResultTone } from "../../../components/ResultTag";
import { CLIENT_CONFIG } from "../../../config";
import { arenaNames, formatShare, ordinal } from "../../../utils/arenaText";
import { spawnConfetti, spawnStars } from "../../../utils/particles";
import { playerStyle } from "../../../utils/playerStyle";
import { seededRandom } from "../../../utils/seededRandom";
import { TERRITORY_CLIENT_CONFIG } from "../config";

interface TerritoryEndingProps {
  arena: Arena;
  myId: PlayerId;
  /** You played this match (not just watched it). */
  playing: boolean;
}

const HUD = TERRITORY_CLIENT_CONFIG.hud;

/**
 * The end of the match, over the arena's own ending (which the canvas plays): a result tag stamps on near
 * the bottom, like tic-tac-toe's. Your win: in your color, tilted, a trophy, your land share counting up,
 * confetti and a ring of stars. Your loss: a quiet tag with your place. Watching: who won.
 */
export function TerritoryEnding({ arena, myId, playing }: TerritoryEndingProps) {
  const tagRef = useRef<HTMLDivElement>(null);
  const winners = arena.championIds;
  const results = arena.results ?? [];
  const exactShare = (id: PlayerId | undefined) => results.find((r) => r.id === id)?.landShare ?? 0;
  const iWon = playing && winners.includes(myId);
  const colorId = iWon ? myId : (winners[0] ?? myId);

  let tone: ResultTone;
  let label: string;
  let shareOf: PlayerId | null = null;
  let detail: string | null = null;
  if (iWon) {
    tone = "win";
    label = winners.length > 1 ? "Shared win!" : "You win!";
    shareOf = myId;
  } else if (playing) {
    tone = "lose";
    label = "You lost";
    const place = results.find((r) => r.id === myId)?.place;
    detail = place ? `${ordinal(place)} place` : null;
  } else {
    tone = "watch";
    label = `${arenaNames(arena, winners)} ${winners.length > 1 ? "win" : "wins"}!`;
    shareOf = winners.length === 1 ? (winners[0] ?? null) : null;
  }

  // The share counts up in whole percents and lands on the exact figure the results show ("0.85%").
  const exact = shareOf === null ? null : exactShare(shareOf);
  const whole = exact === null ? null : Math.round(exact / 100);
  const asShare = (value: number) => (value === whole && exact !== null ? formatShare(exact) : `${value}%`);

  const burst = () => {
    const random = seededRandom(CLIENT_CONFIG.particles.seed);
    const mine = getPlayerColor(myId);
    const tag = tagRef.current?.getBoundingClientRect();
    const middle = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
    return [
      ...spawnConfetti(random, middle, [mine.base, mine.dark, mine.tint, colors.white, colors.waiting], HUD.endTagAtMs),
      ...(tag ? spawnStars(random, { x: tag.left + tag.width / 2, y: tag.bottom }, colors.waiting, HUD.endTagAtMs) : []),
    ];
  };

  return (
    <>
      {/* The tag straddles this box's bottom edge; the stamp waits for the arena's ending to play out. */}
      <div
        ref={tagRef}
        className="pointer-events-none absolute inset-x-0 bottom-end-tag"
        style={{ ...playerStyle(colorId), "--celebrate-at": `${HUD.endTagAtMs}ms` } as CSSProperties}
      >
        <ResultTag tone={tone} label={label} points={whole} detail={detail} countUp landsAtMs={HUD.endTagAtMs} format={asShare} />
      </div>
      {iWon && <Particles spawn={burst} />}
    </>
  );
}
