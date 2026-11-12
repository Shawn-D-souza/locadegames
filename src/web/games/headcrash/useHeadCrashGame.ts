import { useCallback, useEffect, useRef, useState, type RefObject } from "react";
import type { Seat } from "../../../shared/games/types";
import type { Bytes } from "../../../shared/protocol/bytes";
import type { PlayerId } from "../../../shared/rooms/types";
import type { BinaryListener } from "../../hooks/useRoomConnection";
import { HEADCRASH_CLIENT_CONFIG } from "./config";
import type { HudView } from "./engine/frame";
import { HeadCrashClient } from "./engine/headCrashClient";
import { HeadCrashAudio } from "./headCrashAudio";
import { DriveInput } from "./input/driveInput";
import { HeadCrashRenderer } from "./render/headCrashRenderer";

interface HeadCrashGameOptions {
  /** Changes only when another match is on screen. */
  matchKey: string;
  matchId: number;
  seed: number;
  players: readonly [PlayerId, PlayerId];
  /** Your seat, or null when you watch. */
  mySeat: Seat | null;
  score: readonly [number, number];
  startsAt: number;
  /** The room says the match is still being played. */
  live: boolean;
  clockOffsetMs: number;
  sendBinary(data: Bytes): void;
  subscribeBinary(listener: BinaryListener): () => void;
}

interface HeadCrashGame {
  /** The overlay's numbers (refreshed a few times a second, and the moment the score or the countdown changes). */
  hud: HudView | null;
  /** The buttons you hold (bits), for the on-screen buttons' look. */
  held: number;
  /** A finger on (or off) an on-screen button. */
  press(button: number, pointerId: number, down: boolean): void;
}

/**
 * Runs a Head Crash match on a canvas: the netcode client, the renderer, the buttons and the sounds, driven by
 * one animation-frame loop.
 */
export function useHeadCrashGame(canvasRef: RefObject<HTMLCanvasElement | null>, options: HeadCrashGameOptions): HeadCrashGame {
  const [hud, setHud] = useState<HudView | null>(null);
  const [held, setHeld] = useState(0);
  // Room updates must not restart the game: it restarts only for another match.
  const latest = useRef(options);
  useEffect(() => {
    latest.current = options;
  });
  const { matchKey, mySeat, live } = options;
  const clientRef = useRef<HeadCrashClient | null>(null);
  const inputRef = useRef<DriveInput | null>(null);

  useEffect(() => {
    if (!live) clientRef.current?.hold();
  }, [live]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const { matchId, seed, players, score, startsAt, clockOffsetMs, sendBinary, subscribeBinary } = latest.current;
    const client = new HeadCrashClient({ matchId, seed, mySeat, score, startsAt, roomClockOffsetMs: clockOffsetMs, send: sendBinary });
    const renderer = new HeadCrashRenderer(canvas, { players, mySeat });
    const audio = new HeadCrashAudio(mySeat);
    const input =
      mySeat === null
        ? null
        : new DriveInput((buttons) => {
            client.setButtons(buttons);
            setHeld(buttons);
          });
    const unsubscribe = subscribeBinary((data) => client.receive(data));
    if (latest.current.live) client.start();
    else client.hold();
    clientRef.current = client;
    inputRef.current = input;
    // Development only: lets test scripts read the netcode's state.
    if (import.meta.env.DEV) (window as unknown as { headcrash?: HeadCrashClient }).headcrash = client;

    const fit = () => {
      const rect = canvas.getBoundingClientRect();
      renderer.resize(rect.width, rect.height, window.devicePixelRatio || 1);
    };
    fit();
    const observer = new ResizeObserver(fit);
    observer.observe(canvas);

    let raf = 0;
    let hudAt = -Infinity;
    let hudVersion = -1;
    const loop = (now: number) => {
      const frame = client.frame(now);
      renderer.draw(frame, now);
      audio.update(frame, client.takeMoments(), now);
      if (now - hudAt >= HEADCRASH_CLIENT_CONFIG.hud.refreshMs || client.hudVersion !== hudVersion) {
        hudAt = now;
        hudVersion = client.hudVersion;
        setHud(client.hud());
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    // A locked phone or a switched-away tab stops drawing; coming back takes the server's word at once.
    const onVisible = () => {
      if (document.visibilityState === "visible") client.wake();
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener("visibilitychange", onVisible);
      observer.disconnect();
      unsubscribe();
      input?.dispose();
      audio.stop();
      client.stop();
      clientRef.current = null;
      inputRef.current = null;
      setHeld(0);
    };
  }, [canvasRef, matchKey, mySeat]);

  const press = useCallback((button: number, pointerId: number, down: boolean) => inputRef.current?.press(button, pointerId, down), []);
  return { hud, held, press };
}
