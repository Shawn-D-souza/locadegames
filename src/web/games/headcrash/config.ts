import { HEADCRASH_CONFIG } from "../../../shared/games/headcrash/config";

/** Head Crash's client-only numbers: netcode timing, the view, drawing, the overlay and sound. */
export const HEADCRASH_CLIENT_CONFIG = {
  net: {
    /** Clock pings: quick ones first to settle the clock, then a slow keepalive pace. */
    firstPingIntervalMs: 400,
    firstPings: 6,
    pingIntervalMs: 2_000,
    clockSamples: 10,
    clockSlewRate: 0.1,
    clockSnapMs: 250,
    /** Players see the match this far ahead of the server, plus half the round trip and its jitter, so their buttons reach it in time. */
    leadSafetyMs: 20,
    /** A new lead is eased into at this share of real time (the cars run at most this much faster or slower meanwhile), unless it's off by more than `leadSnapMs`. */
    leadSlewRate: 0.06,
    leadSnapMs: 250,
    /** Each button change that still reached the server late adds this much lead (up to the max), fading slowly. */
    lateBoostStepMs: 15,
    lateBoostMaxMs: 150,
    lateBoostDecayPerS: 5,
    /** The match is never played further ahead of the server's last word than this many steps: past it, the cars wait. */
    maxPredictTicks: 45,
    /** When the server's word differs from what was drawn, the difference blends out with this half-life instead of a jump. */
    correctionHalfLifeMs: 70,
    /** Differences bigger than this (meters, radians) are not blended: something really changed (a new round, a sleeping phone). */
    correctionSnap: 5,
    correctionSnapAngle: 2.5,
    /** Differences smaller than this aren't counted as corrections in the dev stats (meters). */
    correctionNoise: 0.02,
    /** Watchers see the match this far in the past (plus jitter), drawn smoothly between the server's snapshots. */
    watchDelayMs: (2 * HEADCRASH_CONFIG.snapshotEveryTicks * 1000) / HEADCRASH_CONFIG.tickRate + 20,
    snapshotsKept: 24,
    /** No snapshot for this long while the match should be live: ask again (the server may have restarted). */
    silenceNudgeMs: 1_000,
    /** A snapshot this many steps older than the last one means the server started the match over (it restarted). */
    restartTicks: 30,
  },
  view: {
    /** The highest device pixel ratio drawn at. (What the view shows is the map's frame, `arena.frame` in the game's config.) */
    maxPixelRatio: 2,
  },
  look: {
    /** Line widths in meters: the ground's outline, and the outline of planks and effects. */
    groundLine: 0.14,
    outline: 0.11,
    /** Planks' corners. Flat, no lips: in this design a lip means "tap me", and nothing in the world is tapped. */
    blockRadius: 0.18,
    /** Pebbles in the ground: roughly this far apart, this small to this big (radius), and kept this far inside its outline. */
    pebbleGap: 1.25,
    pebbleSize: [0.11, 0.3],
    pebbleInset: 0.25,
    /** The hills far behind: two rows (their foot above the frame's bottom, how high they rise, how far apart), meters. */
    hills: [
      { base: 5.5, swell: 1.8, length: 7.5 },
      { base: 3, swell: 1.5, length: 5.5 },
    ],
    /** Clouds high in the sky (x, height above the frame's bottom, size), meters: decoration, not part of the map. */
    clouds: [
      { x: -8.5, y: 11.6, size: 1.1 },
      { x: 3, y: 11.4, size: 0.9 },
      { x: 10, y: 11, size: 1.2 },
    ],
    /**
     * A fan's rising air: faint white streaks floating up (how see-through, how far apart across the fan, their
     * length in meters and speed in meters a second); its grille on the floor (meters tall).
     */
    fanAirAlpha: 0.6,
    fanStreakGap: 1.1,
    fanStreakLength: 1.4,
    fanStreakSpeed: 5,
    fanGrille: 0.35,
    /** Water: how see-through (a little: it is in front of everything), its pale band on top, the wave's height and length (meters) and speed (meters a second). */
    waterAlpha: 0.86,
    crestBand: 0.22,
    waveHeight: 0.16,
    waveLength: 2.6,
    waveSpeed: 1.4,
    /** The warning stripe that blinks along the water once it rises. */
    risingBlinkMs: 500,
    /** Cars: their outline (a little finer than the arena's, so a small car stays crisp), the wheel's rim (share of the wheel) and the lug dots on it. */
    carLine: 0.085,
    rim: 0.62,
    lugs: 5,
    /** A hit: the burst's size (meters) and length, the white flash on the head, the shake (meters) and its length. */
    burstRadius: 1.9,
    burstMs: 520,
    burstSpikes: 9,
    shake: 0.35,
    shakeMs: 380,
    /** The hit head flashes white for a moment. */
    headFlashMs: 120,
    /**
     * Then it stays on and is dazed (owner: no head flying off): it squashes flat (share of its height) and wobbles
     * back (one wobble's length, how quickly it settles), ✕ ✕ eyes on the visor, and dizzy stars circle above it from
     * a moment after the hit (how many, the ring's half width and depth and its height over the head, a star's size, one turn).
     */
    daze: {
      squash: 0.42,
      wobbleMs: 260,
      settleMs: 240,
      starsFromMs: 160,
      stars: 3,
      orbitX: 0.5,
      orbitY: 0.13,
      orbitUp: 0.22,
      starSize: 0.15,
      starSpinMs: 700,
    },
    /** A splash when the water takes a head: drops, their speed and life. */
    splashDrops: 10,
    splashSpeed: 8,
    splashMs: 600,
    /** Dust kicked up by a spinning wheel on the ground: per second, life, size (meters). */
    dustPerS: 28,
    dustMs: 380,
    dustSize: 0.22,
    /** Your own car's marker (a small arrow above it) shows this long at the start of each round. */
    youMarkerMs: 2_400,
    youMarkerSize: 0.5,
  },
  hud: {
    /** How often the overlay's numbers refresh (the score and countdown also refresh the moment they change). */
    refreshMs: 120,
    /** The result tag stamps on this long after the match ends, once the last hit has played. */
    endTagAtMs: 900,
    /** A finished match stays on screen this long, then moves on by itself. */
    endShowMs: 4_600,
  },
  sound: {
    /** Landings and bumps softer than this (speed change, m/s) are silent; this hard and above is the loud take. */
    minImpact: 3,
    hardImpact: 10,
    /** A landing only counts after this long in the air (steps), and impacts sound at most this often. */
    minAirTicks: 10,
    impactCooldownMs: 140,
    /** Moments older than this are not played (the tab was away). */
    momentMaxAgeMs: 500,
  },
} as const;
