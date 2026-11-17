import { useLayoutEffect, useRef } from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";
import type { PlayerId } from "../../../src/shared/rooms/types";
import { CountdownDisc } from "../../../src/web/components/CountdownDisc";
import { IconButton } from "../../../src/web/components/IconButton";
import { LandTable } from "../../../src/web/games/territory/hud/LandTable";
import { MatchClock } from "../../../src/web/games/territory/hud/MatchClock";
import { TerritoryRenderer } from "../../../src/web/games/territory/render/territoryRenderer";
import { TERRITORY_CONFIG } from "../../../src/shared/games/territory/config";
import { AppScreen, STATUS_BAR } from "../parts/AppScreen";
import { FRIENDS } from "../cast";
import { matchView, stepsPerSecond } from "../territory/view";
import { cueSeconds } from "../timing";
import { CLIPS } from "./clips";

const NAMES = new Map<PlayerId, string>(FRIENDS.map((name, id) => [id, name]));
/** The video counts 3, 2, 1 on the beats (the app takes a second each). */
const COUNT_SECONDS = cueSeconds("count2") - cueSeconds("count3");

/**
 * Territory as one friend's phone shows it: 3, 2, 1, then the match from their own head, on the game's real renderer
 * and HUD (the quit button, the clock, the land table). Drawn frame by frame from the scripted match.
 */
export function TerritoryPhoneScreen({ me }: { me: number }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const renderer = useRef<TerritoryRenderer | null>(null);

  const t = (frame + CLIPS.territory.from) / fps;
  const go = cueSeconds("go");
  const step = (t - go) * stepsPerSecond;
  const msAt = (s: number) => (go + s / stepsPerSecond) * 1000;
  const view = matchView(me as PlayerId, step, msAt);
  const counting = t < go;
  const count = Math.ceil((go - t) / COUNT_SECONDS);
  const msLeft = TERRITORY_CONFIG.matchMs - Math.max(0, t - go) * 1000;

  // Sized from the screen, not measured: Remotion lays a frame out off-page first, where everything measures 0.
  const { width, height } = useVideoConfig();
  useLayoutEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    if (!renderer.current) {
      renderer.current = new TerritoryRenderer(canvas);
      renderer.current.resize(width, height - STATUS_BAR, window.devicePixelRatio || 1);
    }
    renderer.current.draw(view.frame, t * 1000, NAMES);
  });

  return (
    <AppScreen statusBar>
      <div className="absolute inset-0 overflow-hidden bg-line select-none">
        <canvas ref={canvasRef} className="absolute inset-0 size-full" />
        <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between gap-2 p-4">
          <div className="flex flex-col items-start gap-2">
            <IconButton icon="close" label="Quit match" onClick={() => {}} />
            {!counting && <MatchClock msLeft={msLeft} />}
          </div>
          {!counting && <LandTable shares={view.shares} names={NAMES} myId={me as PlayerId} />}
        </div>
        {counting && count > 0 && (
          <div className="pointer-events-none absolute inset-x-0 top-0 flex h-1/2 items-center justify-center">
            <CountdownDisc count={count} />
          </div>
        )}
      </div>
    </AppScreen>
  );
}
