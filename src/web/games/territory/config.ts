import { TERRITORY_CONFIG } from "../../../shared/games/territory/config";

/** Territory's client-only numbers: netcode timing, camera, drawing and controls. */
export const TERRITORY_CLIENT_CONFIG = {
  net: {
    /** Clock pings: quick ones first to settle the clock, then a slow keepalive pace. */
    firstPingIntervalMs: 500,
    firstPings: 6,
    pingIntervalMs: 2_000,
    /** Clock samples kept; the fastest round trip among them sets the clock (least queueing). */
    clockSamples: 10,
    /** The displayed clock eases toward a new estimate at this share of real time, so nothing jumps. */
    clockSlewRate: 0.1,
    /** A clock error bigger than this is fixed at once (after a stall or a sleeping phone). */
    clockSnapMs: 250,
    /** Other players are drawn at least this far in the past, so their moves are always smooth. */
    minInterpMs: 100,
    /** Recent snapshot delays kept to size that gap (2 s worth). */
    lateWindow: 40,
    /** The gap shrinks at most this fast (ms per s) once the connection calms down. */
    interpShrinkPerS: 20,
    /** Your own head runs this far ahead of the server, plus half the round trip and its jitter. */
    leadSafetyMs: 20,
    /** Each input that still reached the server late adds this much lead (up to the max), fading slowly. */
    lateBoostStepMs: 15,
    lateBoostMaxMs: 150,
    lateBoostDecayPerS: 5,
    /** Others keep moving this many steps past their last snapshot during a hiccup, then wait. */
    maxExtrapolateTicks: 3,
    /** A correction to your own head blends out with this half-life, instead of a jump. */
    correctionHalfLifeMs: 60,
    /** Corrections bigger than this snap (a resync, not a hiccup). */
    correctionSnapUnits: 4_000,
    /** Steering is sent in steps of this many angle units (256 directions), so a steady thumb sends nothing. */
    targetQuantum: 16,
    /** Positions kept per player for drawing them in the past. */
    historyTicks: 120,
  },
  camera: {
    /** Trail widths visible across the screen's short side, and at most across the long side. */
    shortSideWidths: 18,
    longSideMaxWidths: 34,
    /** How quickly the camera follows (share of the distance per 1/60 s). */
    follow: 0.25,
    /** Watching (or out): the whole arena fits with this margin (share of the screen). */
    overviewMargin: 0.06,
    /** Highest device pixel ratio drawn at; more costs battery for no visible gain. */
    maxPixelRatio: 2,
  },
  look: {
    /** Raised land: the solid side under each piece of land, in trail widths. */
    landLip: 0.22,
    /** Heads: size (the solid disc's width, so heads touch exactly) and lip, in trail widths. */
    headSize: (2 * TERRITORY_CONFIG.headRadius) / TERRITORY_CONFIG.trailWidth,
    headLip: 0.2,
    headCorner: 0.28,
    outline: 0.07,
    /** Trail: inside lighter than the land, edged in the player's color. */
    trailInnerShare: 0.62,
    trailLighten: 0.45,
    /** The arena floor's dot grid, in trail widths. */
    floorDotGap: 2,
    floorDotRadius: 0.07,
    /** The arena wall: thickness and lip, in trail widths. */
    wallWidth: 0.6,
    wallLip: 0.35,
    /** New land flashes white, then fades. */
    captureFlashMs: 450,
    captureFlashAlpha: 0.75,
    /** A head bursting when its player goes out. */
    burstMs: 700,
    /** Land cut off from its owner fades away. */
    vanishMs: 700,
    /** The view shakes (CSS px) when you go out (hard) or knock someone out (light). */
    shakeMs: 450,
    shakeHardPx: 12,
    shakeLightPx: 5,
    /** The ending, on the arena (ms from the end): a thump, then the camera pulls out to the whole arena. */
    thumpMs: 320,
    thumpScale: 0.07,
    /** Everyone but the winners washes out toward the floor color. */
    washAtMs: 450,
    washFadeMs: 450,
    washAlpha: 0.62,
    /** Rays in the winner's color turn around the arena. */
    raysAtMs: 500,
    raysFadeMs: 600,
    rayCount: 18,
    raysTurnPerS: 0.12,
    /** A big copy of each winner's head (CSS px) drops onto them with a crown. */
    winnerHeadAtMs: 650,
    winnerHeadDropMs: 380,
    winnerHeadPx: 34,
    burstPieces: 14,
    burstSpread: 3,
    /** Name tags over other heads (screen px). */
    nameFontPx: 12,
    nameGapPx: 10,
  },
  controls: {
    /** Drag this far (CSS px) before a direction counts. */
    deadZonePx: 8,
    /** The (invisible) joystick's reach; dragging past it pulls its center along. */
    stickRadiusPx: 56,
  },
  sound: {
    /** Your capture's size (area in world units): from these on it's a medium and a large one. */
    captureMediumArea: (11 * TERRITORY_CONFIG.trailWidth) ** 2,
    captureLargeArea: (24 * TERRITORY_CONFIG.trailWidth) ** 2,
    /** Others' knockouts: full volume this near you (about what's on screen), silent from here on (world units). */
    hearFullAt: 12 * TERRITORY_CONFIG.trailWidth,
    hearNoneAt: 36 * TERRITORY_CONFIG.trailWidth,
    /** Watching the whole arena: everything is heard at this volume. */
    watchingVolume: 0.7,
    /** Your head counts as touching a head at this share of their gap, and free again past the second. */
    bumpShare: 1.03,
    bumpFreeShare: 1.25,
    /** Touching the wall this close to its limit, free again this far (world units). */
    wallTouch: 0.06 * TERRITORY_CONFIG.trailWidth,
    wallFree: 0.7 * TERRITORY_CONFIG.trailWidth,
    /** The trail's marker: at start, and after this long out; a longer trail is more to lose. */
    trailVolume: { from: 0.65, to: 1 },
    trailRate: { from: 1, to: 1.22 },
    trailBuildMs: 14_000,
    /** How often your head's checked for being on someone else's land, and how the same trail sound changes there: darker, slower, heavier. */
    rivalLandCheckMs: 120,
    trailOnRivalLand: { cutoffHz: 900, rate: 0.85, volume: 1.5 },
    trailOpenCutoffHz: 16_000,
    /** A moment older than this (the tab was hidden) isn't played. */
    momentMaxAgeMs: 400,
  },
  hud: {
    /** How often the timer and land shares redraw. */
    refreshMs: 250,
    /** Minimap size (CSS px). */
    minimapPx: 96,
    minimapRefreshMs: 200,
    /** Minimap: room around the arena (share of its size), see-through floor, and the tiny heads (CSS px). */
    minimapMargin: 1.04,
    minimapFloorAlpha: 0.9,
    minimapHeadPx: { me: 9, other: 7, lip: 1.5, outline: 1.25, cornerShare: 0.3 },
    /** Rows on the land table (you always show, even below these). */
    leaderboardRows: 5,
    /** The clock's last seconds tick, turning coral with the clock. */
    clockTicksFromS: 10,
    /** The ending plays this long (taps do nothing), then the results. */
    endShowMs: 6_000,
    /** When the result tag stamps on (ms from the end), with the winner's confetti. */
    endTagAtMs: 950,
    /** Knockout notices ("Ana cut Ben") stay this long; at most this many at once. */
    knockoutShowMs: 3_000,
    knockoutRows: 3,
    /** Your own knockout ("CUT BEN!") pops over your head this long. */
    killPopMs: 1_600,
  },
} as const;
