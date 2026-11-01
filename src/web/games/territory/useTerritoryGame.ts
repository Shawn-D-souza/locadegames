import { useEffect, useRef, useState, type RefObject } from "react";
import type { Arena } from "../../../shared/arena/types";
import type { Bytes } from "../../../shared/protocol/bytes";
import type { PlayerId } from "../../../shared/rooms/types";
import type { BinaryListener } from "../../hooks/useRoomConnection";
import { TERRITORY_CLIENT_CONFIG } from "./config";
import type { HudView } from "./engine/frame";
import { TerritoryClient } from "./engine/territoryClient";
import { SteeringInput } from "./input/steeringInput";
import { TerritoryRenderer } from "./render/territoryRenderer";

interface TerritoryGameOptions {
  arena: Arena;
  myId: PlayerId;
  clockOffsetMs: number;
  sendBinary(data: Bytes): void;
  subscribeBinary(listener: BinaryListener): () => void;
}

/**
 * Runs a Territory match on a canvas: the netcode client, the renderer and the controls, driven by one
 * animation-frame loop. Returns the overlay's numbers (refreshed a few times a second, not every frame).
 */
export function useTerritoryGame(canvasRef: RefObject<HTMLCanvasElement | null>, options: TerritoryGameOptions): HudView | null {
  const [hud, setHud] = useState<HudView | null>(null);
  // Room updates (every few seconds) must not restart the game: it restarts only for a new match.
  const latest = useRef(options);
  useEffect(() => {
    latest.current = options;
  });
  const matchKey = options.arena.startedAt;
  const finished = options.arena.finished;
  const { myId } = options;
  const clientRef = useRef<TerritoryClient | null>(null);

  useEffect(() => {
    if (finished) clientRef.current?.finish(latest.current.arena.championIds);
  }, [finished]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const { arena, clockOffsetMs, sendBinary, subscribeBinary } = latest.current;
    const playing = arena.entrants.some((e) => e.id === myId);
    const client = new TerritoryClient({
      myId,
      playing,
      radius: arena.radius,
      startsAt: arena.startsAt,
      roomClockOffsetMs: clockOffsetMs,
      send: sendBinary,
    });
    const renderer = new TerritoryRenderer(canvas);
    const steering = playing ? new SteeringInput(canvas, (angle) => client.steer(angle)) : null;
    const names = new Map(arena.entrants.map((e) => [e.id, e.name]));
    const unsubscribe = subscribeBinary((data) => client.receive(data));
    client.start();
    clientRef.current = client;
    if (arena.finished) client.finish(arena.championIds);
    // Development only: lets test scripts read the netcode's state.
    if (import.meta.env.DEV) (window as unknown as { territory?: TerritoryClient }).territory = client;

    const fit = () => {
      const rect = canvas.getBoundingClientRect();
      renderer.resize(rect.width, rect.height, window.devicePixelRatio || 1);
    };
    fit();
    const observer = new ResizeObserver(fit);
    observer.observe(canvas);

    let raf = 0;
    let hudAt = -Infinity;
    let hudVersion = client.hudVersion;
    const loop = (now: number) => {
      const frame = client.frame(now);
      if (frame) renderer.draw(frame, now, names);
      if (now - hudAt >= TERRITORY_CLIENT_CONFIG.hud.refreshMs || client.hudVersion !== hudVersion) {
        hudAt = now;
        hudVersion = client.hudVersion;
        setHud(client.hud(now));
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    // A locked phone or a switched-away tab stops drawing; coming back resyncs everything at once.
    const onVisible = () => {
      if (document.visibilityState === "visible") client.wake();
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener("visibilitychange", onVisible);
      observer.disconnect();
      unsubscribe();
      steering?.dispose();
      client.stop();
      clientRef.current = null;
    };
  }, [canvasRef, matchKey, myId]);

  return hud;
}
