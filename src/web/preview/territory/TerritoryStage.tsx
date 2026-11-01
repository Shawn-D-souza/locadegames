import { useEffect, useRef } from "react";
import { TERRITORY_CONFIG } from "../../../shared/games/territory/config";
import type { PlayerId } from "../../../shared/rooms/types";
import type { EffectView, EndingView } from "../../games/territory/engine/frame";
import { KillPop } from "../../games/territory/hud/KillPop";
import { KnockoutFeed } from "../../games/territory/hud/KnockoutFeed";
import { TerritoryEnding } from "../../games/territory/hud/TerritoryEnding";
import { TerritoryRenderer } from "../../games/territory/render/territoryRenderer";
import { arenaName } from "../../utils/arenaText";
import { buildScene, sceneArena, sceneFrame, sceneKnockout, VICTIM_ID } from "./territoryScene";

export type TerritoryMoment = "win" | "lose" | "watch" | "kill";

/** Built once: the simulation takes a moment, and every replay uses the same match. */
const scene = buildScene();
const arena = sceneArena(scene);
const names = new Map(arena.entrants.map((e) => [e.id, e.name]));
const winner = arena.championIds[0] ?? 0;
const loser = arena.entrants.find((e) => !arena.championIds.includes(e.id))?.id ?? 0;

/** Whose phone the moment is seen on (null: someone watching). */
const VIEWER: Record<TerritoryMoment, PlayerId | null> = { win: winner, lose: loser, watch: null, kill: winner };

/** One Territory moment on the real renderer and HUD pieces, playing from its first frame. */
export function TerritoryStage({ moment }: { moment: TerritoryMoment }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const viewer = VIEWER[moment];

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const renderer = new TerritoryRenderer(canvas);
    const fit = () => {
      const rect = canvas.getBoundingClientRect();
      renderer.resize(rect.width, rect.height, window.devicePixelRatio || 1);
    };
    fit();
    const observer = new ResizeObserver(fit);
    observer.observe(canvas);

    const startedAt = performance.now();
    const victim = scene.players.find((p) => p.id === VICTIM_ID)!;
    const kill = moment === "kill";
    const effects: EffectView[] = kill
      ? [
          { kind: "burst", id: VICTIM_ID, x: victim.x, y: victim.y, startedAt },
          { kind: "shake", strength: "light", startedAt },
        ]
      : [];
    const ending: EndingView | null = kill ? null : { winners: arena.championIds, startedAt };
    // Your head right where you crossed their trail, so the burst is in view.
    const meAt = kill ? { x: victim.x + TERRITORY_CONFIG.trailWidth * 2, y: victim.y } : undefined;
    const frame = sceneFrame(scene, viewer, { gone: kill ? VICTIM_ID : undefined, effects, ending, meAt });

    let raf = 0;
    const loop = (now: number) => {
      renderer.draw(frame, now, names);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      observer.disconnect();
    };
  }, [moment, viewer]);

  const me = viewer ?? winner;
  return (
    <>
      <canvas ref={canvasRef} className="absolute inset-0 size-full" aria-label="Territory arena" />
      {moment === "kill" ? (
        <>
          <div className="pointer-events-none absolute top-0 left-0 p-4">
            <KnockoutFeed knockouts={[sceneKnockout(me, 0)]} arena={arena} myId={me} />
          </div>
          <KillPop label={`Cut ${arenaName(arena, VICTIM_ID)}!`} colorId={me} />
        </>
      ) : (
        <TerritoryEnding arena={arena} myId={me} playing={viewer !== null} />
      )}
    </>
  );
}
