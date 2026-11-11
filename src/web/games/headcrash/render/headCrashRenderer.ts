import { buttonDirection, HEADCRASH_CONFIG } from "../../../../shared/games/headcrash/config";
import { headOf, wheelSink } from "../../../../shared/games/headcrash/physics";
import { HIT_CAUSE, PHASE, type Layout } from "../../../../shared/games/headcrash/types";
import type { Seat } from "../../../../shared/games/types";
import type { PlayerId } from "../../../../shared/rooms/types";
import { HEADCRASH_CLIENT_CONFIG } from "../config";
import type { CarView, FrameView } from "../engine/frame";
import { drawCar, drawYouMarker } from "./drawCar";
import { drawBurst, drawDust, drawSplash, type Dust } from "./drawEffects";
import { carPaint } from "./palette";
import { drawFanAir, drawSlabs, drawWater, drawWorld, worldPaths, type WorldPaths } from "./drawWorld";
import { fitArena, visibleRect } from "./view";

const CAR = HEADCRASH_CONFIG.car;
const LOOK = HEADCRASH_CLIENT_CONFIG.look;
const SEATS = [0, 1] as const;

export interface RendererOptions {
  /** Who drives each seat's car (their colors). */
  players: readonly [PlayerId, PlayerId];
  /** Your seat, or null when you watch. */
  mySeat: Seat | null;
}

/**
 * Draws a Head Crash frame on a canvas, in world units (meters, y up): the map's whole frame always in view and
 * the world filling the rest of the screen. What never moves (sky, ground, planks) is drawn once per map and size
 * into a second canvas; each frame copies it and draws the cars, the water in front, and the effects.
 */
export class HeadCrashRenderer {
  private readonly ctx: CanvasRenderingContext2D;
  private width = 1;
  private height = 1;
  private pixelRatio = 1;
  private layout: Layout | null = null;
  private paths: WorldPaths | null = null;
  /** The still world, drawn for this map and size, a little bigger than the canvas so a shake never shows its edge. */
  private still: { canvas: HTMLCanvasElement; key: string; margin: number } | null = null;
  /** How far each car's wheels have turned, and where each car was last drawn. */
  private readonly wheelTurn: [number, number] = [0, 0];
  private readonly last: [{ x: number; y: number } | null, { x: number; y: number } | null] = [null, null];
  private dust: Dust[] = [];
  private lastDrawAt: number | null = null;

  constructor(
    private readonly canvas: HTMLCanvasElement,
    private readonly options: RendererOptions,
  ) {
    this.ctx = canvas.getContext("2d")!;
  }

  resize(width: number, height: number, devicePixelRatio: number) {
    this.width = Math.max(1, width);
    this.height = Math.max(1, height);
    this.pixelRatio = Math.min(devicePixelRatio, HEADCRASH_CLIENT_CONFIG.view.maxPixelRatio);
    this.canvas.width = Math.round(this.width * this.pixelRatio);
    this.canvas.height = Math.round(this.height * this.pixelRatio);
  }

  draw(frame: FrameView, now: number) {
    const { ctx } = this;
    const elapsed = this.lastDrawAt === null ? 0 : Math.min(100, now - this.lastDrawAt);
    this.lastDrawAt = now;
    if (frame.layout !== this.layout) {
      this.layout = frame.layout;
      this.paths = worldPaths(frame.layout);
      this.dust = [];
      this.last[0] = null;
      this.last[1] = null;
    }
    const view = fitArena(frame.layout, this.width, this.height);
    const hitAge = frame.hit ? now - frame.hit.shownAt : Infinity;
    const still = this.stillWorld(frame.layout, view);

    // A hit shakes the whole view for a moment.
    const shake = hitAge < LOOK.shakeMs ? LOOK.shake * (1 - hitAge / LOOK.shakeMs) * view.scale : 0;
    const shakeX = shake > 0 ? Math.sin(hitAge / 17) * shake : 0;
    const shakeY = shake > 0 ? Math.cos(hitAge / 13) * shake : 0;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.drawImage(still.canvas, Math.round((shakeX - still.margin) * this.pixelRatio), Math.round((shakeY - still.margin) * this.pixelRatio));
    // World units from here: meters, y up.
    const scale = view.scale * this.pixelRatio;
    ctx.setTransform(scale, 0, 0, -scale, (view.originX + shakeX) * this.pixelRatio, (view.originY + shakeY) * this.pixelRatio);

    drawFanAir(ctx, frame.layout, now);
    drawSlabs(ctx, frame.layout, frame.motion);
    for (const seat of SEATS) this.trackCar(seat, frame.cars[seat], frame.phase === PHASE.play, elapsed, now);
    drawDust(ctx, this.dust, now);
    for (const seat of SEATS) this.drawCar(seat, frame, hitAge);
    drawWater(ctx, visibleRect(view, this.width, this.height, still.margin), frame.waterY, frame.waterRising, now);
    this.drawHit(frame, hitAge);
    this.drawMarker(frame, now);
  }

  /** The still world for this map at this size: drawn again only when either changes. */
  private stillWorld(layout: Layout, view: ReturnType<typeof fitArena>) {
    const margin = Math.ceil(LOOK.shake * view.scale) + 2;
    const key = `${layout.name}:${this.width}x${this.height}@${this.pixelRatio}`;
    if (this.still?.key === key) return this.still;
    const canvas = this.still?.canvas ?? document.createElement("canvas");
    canvas.width = Math.round((this.width + 2 * margin) * this.pixelRatio);
    canvas.height = Math.round((this.height + 2 * margin) * this.pixelRatio);
    const ctx = canvas.getContext("2d")!;
    const scale = view.scale * this.pixelRatio;
    ctx.setTransform(scale, 0, 0, -scale, (view.originX + margin) * this.pixelRatio, (view.originY + margin) * this.pixelRatio);
    drawWorld(ctx, layout, this.paths!, visibleRect(view, this.width, this.height, margin));
    this.still = { canvas, key, margin };
    return this.still;
  }

  /** Turns a car's wheels by how far it moved along its own length, and kicks up dust behind a driven wheel. */
  private trackCar(seat: Seat, car: CarView, playing: boolean, elapsed: number, now: number) {
    const last = this.last[seat];
    const alongX = Math.cos(car.angle);
    const alongY = Math.sin(car.angle);
    if (last) this.wheelTurn[seat] -= ((car.x - last.x) * alongX + (car.y - last.y) * alongY) / CAR.wheelRadius;
    this.last[seat] = { x: car.x, y: car.y };
    const direction = buttonDirection(car.buttons);
    if (!playing || !car.grounded || direction === 0) return;
    // In the air the wheels spin with the button.
    const puffs = (LOOK.dustPerS * elapsed) / 1000;
    if (Math.random() >= puffs) return;
    // Behind the rear wheel, thrown back and up a little. (Looks only: the simulation never sees this randomness.)
    const rear = -direction * CAR.wheelX;
    const down = CAR.wheelY - CAR.wheelRadius;
    this.dust.push({
      x: car.x + alongX * rear - alongY * down,
      y: car.y + alongY * rear + alongX * down,
      vx: -direction * alongX * 2.5 - alongY * 1.2 + (Math.random() - 0.5),
      vy: -direction * alongY * 2.5 + alongX * 1.2 + (Math.random() - 0.5),
      bornAt: now,
    });
  }

  private drawCar(seat: Seat, frame: FrameView, hitAge: number) {
    const car = frame.cars[seat];
    // A hit driver stays in the car, dazed, until the next round.
    const dazed = !!frame.hit && frame.hit.victims[seat];
    const squeeze = wheelSink(car, frame.layout, frame.motion);
    drawCar(this.ctx, car.x, car.y, car.angle, {
      paint: carPaint(this.options.players[seat]),
      facing: seat === 0 ? 1 : -1,
      wheelTurn: this.wheelTurn[seat],
      wheelSqueeze: squeeze,
      dazedFor: dazed ? hitAge : null,
    });
  }

  /** Where a head was hit: a splash if the water took it, else the burst at the spot (the dazed head is drawn with its car). */
  private drawHit(frame: FrameView, hitAge: number) {
    const hit = frame.hit;
    if (!hit) return;
    if (hit.cause === HIT_CAUSE.water) {
      for (const seat of SEATS) if (hit.victims[seat]) drawSplash(this.ctx, headOf(frame.cars[seat]).x, hit.waterY, hitAge);
      return;
    }
    drawBurst(this.ctx, hit.x, hit.y, hitAge);
  }

  private drawMarker(frame: FrameView, now: number) {
    const seat = this.options.mySeat;
    const age = now - frame.roundShownAt;
    if (seat === null || age > LOOK.youMarkerMs || frame.phase === PHASE.hit || frame.phase === PHASE.over) return;
    const car = frame.cars[seat];
    drawYouMarker(this.ctx, car.x, car.y, carPaint(this.options.players[seat]), 0.18 * Math.sin(now / 160));
  }
}
