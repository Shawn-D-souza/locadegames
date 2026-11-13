import { useLayoutEffect, useMemo, useState } from "react";
import { isGameOver, seatsToMove } from "../../../shared/games/seabattle/rules";
import type { SeaBattleState } from "../../../shared/games/seabattle/types";
import type { Seat } from "../../../shared/games/types";
import { useLandscape } from "../../hooks/useLandscape";
import { possessive } from "../../utils/partyText";
import type { MatchBoardProps } from "../matchLook";
import { Cannon } from "./Cannon";
import { CannonBall } from "./CannonBall";
import { FleetEditor } from "./FleetEditor";
import { FleetRow } from "./FleetRow";
import { shotResult } from "./seaBattleCues";
import { seaBattleStatus } from "./seaBattleText";
import { SeaStage } from "./SeaStage";
import { SeaWaters, type HullOnBoard, type Impact } from "./SeaWaters";
import { cannonAim, cellMiddle, stageLayout } from "./stageGeometry";
import { useSeaBattleSounds } from "./useSeaBattleSounds";
import { useVolley, type Volley } from "./useVolley";

const other = (seat: Seat): Seat => (seat === 0 ? 1 : 0);

/**
 * A seat's ships as anyone may see them: only the sunk ones, burnt, on everyone's screen (owner decision: not even
 * your own afloat ships show; you placed them, you know), and at the end the ones never found (paler).
 */
function hullsOf(game: SeaBattleState, seat: Seat): HullOnBoard[] {
  const sunk = new Set(game.wrecks[seat].map((w) => w.index));
  const wrecks = game.wrecks[seat].map((w): HullOnBoard => ({ ship: w, index: w.index, look: "wreck" }));
  const fleet = isGameOver(game) ? (game.fleets[seat] ?? []) : [];
  const unfound = fleet.flatMap((ship, index): HullOnBoard[] => (sunk.has(index) ? [] : [{ ship, index, look: "revealed" }]));
  return [...unfound, ...wrecks];
}

/** How a landed ball shows on the waters it hit: a splash, a blast, or a bigger one when it finished a ship. */
function impactOf(game: SeaBattleState, volley: Volley): Impact & { shooter: Seat } {
  return { key: volley.key, cell: volley.cell, kind: shotResult(game, other(volley.shooter), volley.cell), shooter: volley.shooter };
}

/**
 * Sea Battle on the match screen. Placing: your fleet to set. Then both waters at once, theirs on top (on the right in
 * landscape) and yours under them: the waters being fired at big, the other small with the shooter's cannon on it.
 * Hold to aim (your cannon follows your finger), let go to fire: the ball flies and the hit or miss shows as it lands;
 * after a miss the boards trade sizes and the other's cannon comes in. Watchers see it from the left player's side.
 * Its sounds and feels follow the stage (`useSeaBattleSounds`).
 */
export function SeaBattleBoard({ game, seatColors, seatNames, playableSeat, viewerSeat, turnEndsAt, ending, tagLandsAtMs, ref, onPlay, onShownToMove, onLastMoveShown }: MatchBoardProps<SeaBattleState>) {
  const me: Seat = viewerSeat ?? 0;
  const them = other(me);
  const playing = viewerSeat !== null;
  const landscape = useLandscape();
  const { shown, turn, volley, flying, impact, fire, finishing } = useVolley(game);
  const [aim, setAim] = useState<number | null>(null);
  const over = isGameOver(game);
  // Over once the shot that ended it is down: until then the stage plays it out like any other (the ending waits).
  const done = over && !finishing;
  const placing = game.phase === "place" && !over;
  const hulls = useMemo(() => [hullsOf(shown, 0), hullsOf(shown, 1)] as const, [shown]);
  const landed = useMemo(() => impact && impactOf(game, impact), [game, impact]);
  const impactOn = (seat: Seat) => (landed && other(landed.shooter) === seat ? landed : null);

  // The cards and the wash follow the boards: the shooter stays lit until their ball is down and has had its moment.
  const acting = placing || done ? seatsToMove(game).join() : String(turn);
  useLayoutEffect(() => {
    onShownToMove(acting === "" ? [] : acting.split(",").map((seat) => Number(seat) as Seat));
  }, [acting, onShownToMove]);
  useLayoutEffect(() => {
    if (done) onLastMoveShown();
  }, [done, onLastMoveShown]);

  // The waters being fired at are big: theirs on your shot (and while placing, and at the end), yours on theirs.
  const shooter: Seat | null = placing || done ? null : turn;
  // The ending plays the last shot's landing, as its ball comes down (the ending waits for it).
  useSeaBattleSounds({ viewer: viewerSeat, shooter, volley, landed: over ? null : landed, aim });

  if (placing && playableSeat !== null) {
    return (
      <FleetEditor
        status={seaBattleStatus(game, viewerSeat, seatNames)}
        myId={seatColors[playableSeat]}
        placed={game.ready[playableSeat] ? game.fleets[playableSeat] : null}
        endsAt={turnEndsAt}
        send={(fleet) => onPlay({ place: fleet })}
      />
    );
  }

  const farBig = shooter === null || shooter === me;
  const layout = stageLayout(landscape, farBig);
  const yourShot = shooter !== null && shooter === playableSeat && game.turn === playableSeat && !flying;
  const label = (seat: Seat) => (playing && seat === me ? "Your fleet" : `${possessive(seatNames[seat])} waters`);
  const sunk = (seat: Seat) => new Set(shown.wrecks[seat].map((w) => w.index));
  const waters = (seat: Seat) => {
    const big = (seat === them) === farBig;
    return (
      <SeaWaters
        ref={big ? ref : undefined}
        label={label(seat)}
        marks={shown.marks[seat]}
        hulls={hulls[seat]}
        ownerId={seatColors[seat]}
        freshCell={shown.lastShot && shown.lastShot.seat !== seat ? shown.lastShot.cell : null}
        impact={impactOn(seat)}
        shooterId={big && yourShot ? seatColors[me] : null}
        onFire={
          big && yourShot
            ? (cell) => {
                fire(me, cell);
                onPlay({ fire: cell });
              }
            : undefined
        }
        onAim={big && yourShot ? setAim : undefined}
        ending={big ? ending : null}
        tagLandsAtMs={tagLandsAtMs}
      />
    );
  };

  // The shooter's cannon sits on the small board (theirs on top, yours under), pointing where the ball goes.
  const shooterNear = shooter === me;
  const small = shooterNear ? layout.near : layout.far;
  const big = shooterNear ? layout.far : layout.near;
  const firing = volley !== null && volley.shooter === shooter ? volley : null;
  const target = firing ? firing.cell : yourShot ? aim : null;
  const cannon = cannonAim(small, big, target);

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      <p className="min-h-lh text-center font-display text-label font-black uppercase" aria-live="polite">
        {seaBattleStatus(shown, viewerSeat, seatNames)}
      </p>
      <SeaStage
        layout={layout}
        landscape={landscape}
        farBig={farBig}
        far={waters(them)}
        near={waters(me)}
        strip={
          <>
            <FleetRow label={`${possessive(seatNames[them])} ships`} sunk={sunk(them)} ownerId={seatColors[them]} />
            <FleetRow label={playing ? "Your ships" : `${possessive(seatNames[me])} ships`} sunk={sunk(me)} ownerId={seatColors[me]} />
          </>
        }
      >
        {shooter !== null && <Cannon key={shooter} colorId={seatColors[shooter]} aim={cannon} shot={firing && { key: firing.key, delayMs: firing.delayMs }} />}
        {firing && flying && <CannonBall key={firing.key} from={cannon.muzzle} to={cellMiddle(big, firing.cell)} delayMs={firing.delayMs} />}
      </SeaStage>
    </div>
  );
}
