import type { Land, OutReason, Point } from "../../../../shared/games/territory/types";
import type { PlayerId } from "../../../../shared/rooms/types";

/** Everything one drawn frame needs, in world units. Built by the client engine, drawn by the renderer. */

export interface HeadView {
  x: number;
  y: number;
  /** Radians. */
  angle: number;
}

export interface PlayerFrame {
  id: PlayerId;
  isMe: boolean;
  /** Null once out (or not in the match). */
  head: HeadView | null;
  /** Trail from the exit point to the head; null while home. */
  trail: Point[] | null;
  /** Land layers, drawn in the same color on top of each other (see the client engine). */
  land: Land[];
  /** The land the trail is clipped against (drawn trails start exactly at its edge). */
  home: Land;
}

export type EffectView =
  /** New land flashing white. */
  | { kind: "flash"; land: Land; startedAt: number }
  /** A head bursting when its player goes out. */
  | { kind: "burst"; id: PlayerId; x: number; y: number; startedAt: number }
  /** Land cut off from its owner fading away (drawn with the land, under trails and heads). */
  | { kind: "vanish"; id: PlayerId; land: Land; startedAt: number }
  /** The view shaking: hard when you go out, a little when you knock someone out. */
  | { kind: "shake"; strength: "hard" | "light"; startedAt: number };

/** Something happened in the match: collected by the client for whoever reacts to it (the sound), taken once. */
export type MomentView =
  /** Your new land; `area` in world units. */
  | { kind: "capture"; area: number; at: number }
  /** Someone is out. */
  | { kind: "out"; id: PlayerId; by: PlayerId | null; reason: OutReason | null; x: number; y: number; at: number };

/** The match is over: who won, and when the ending started (performance.now). */
export interface EndingView {
  winners: PlayerId[];
  startedAt: number;
}

/** Someone went out: shown as a notice (and, if you did it, celebrated). */
export interface KnockoutView {
  id: PlayerId;
  /** Who did it (cut them or took the last of their land); null for a quit. */
  by: PlayerId | null;
  reason: OutReason;
  /** When it was shown (performance.now). */
  at: number;
}

export interface FrameView {
  radius: number;
  /** Players in draw order: everyone else first, you last (on top). */
  players: PlayerFrame[];
  effects: EffectView[];
  /** Where the camera looks: your head while you play; null to show the whole arena. */
  focus: Point | null;
  /** The match is over: the ending plays on the arena (and the minimap goes). */
  ending: EndingView | null;
}

/** What the screen's overlay shows; refreshed a few times a second. */
export interface HudView {
  synced: boolean;
  /** Ms until play starts (> 0 during the countdown). */
  countdownMs: number;
  /** Ms of play left. */
  timeLeftMs: number;
  /** Land share per player still in, in hundredths of a percent, best first. */
  shares: { id: PlayerId; share: number }[];
  /** Players out, in the order they went out. */
  out: PlayerId[];
  meAlive: boolean;
  /** Why you are out (null while you are still in). */
  myOutReason: OutReason | null;
  /** Who knocked you out (cut you or took the last of your land), if anyone. */
  myCutter: PlayerId | null;
  /** Recent knockouts, oldest first. */
  knockouts: KnockoutView[];
}
