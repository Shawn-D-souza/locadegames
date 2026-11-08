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
    /** It grows at most this share of real time (others move at least 70% speed meanwhile), so they never jump back. */
    interpGrowRate: 0.3,
    /** Your own head runs this far ahead of the server, plus half the round trip and its jitter. */
    leadSafetyMs: 20,
    /** A new lead is eased into at this share of real time (your head runs at most this much faster or slower meanwhile), unless it's off by more than `leadSnapMs`. */
    leadSlewRate: 0.06,
    leadSnapMs: 250,
    /** Each input that still reached the server late adds this much lead (up to the max), fading slowly. */
    lateBoostStepMs: 15,
    lateBoostMaxMs: 150,
    lateBoostDecayPerS: 5,
    /** Others keep moving this many steps past their last snapshot during a hiccup, then wait. */
    maxExtrapolateTicks: 3,
    /** A correction to a head (yours, or someone guessed through a hiccup) blends out with this half-life, instead of a jump. */
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
    landLip: 0.32,
    /** A light band along the land's top edges (in trail widths), as if lit from above, and how much lighter. */
    landEdge: 0.12,
    landEdgeLighten: 0.4,
    /**
     * The land's pattern (`landPatterns.ts`): its kind, each kind's tile size, the depth of sides and
     * shadows and the light edge (all in trail widths), and how much darker or lighter each shade is.
     */
    landPattern: {
      kind: "studs" as "studs" | "holes" | "tiles" | "grooves" | "stamps" | "rivets",
      tile: { studs: 2.2, holes: 2.2, tiles: 1.6, grooves: 2.4, stamps: 3.6, rivets: 2.6 },
      depth: 0.2,
      edge: 0.07,
      shades: { side: 0.3, top: 0.1, light: 0.5, shadow: 0.3, hole: 0.1 },
    },
    /** Heads: size (the solid disc's width, so heads touch exactly), in trail widths. */
    headSize: (2 * TERRITORY_CONFIG.headRadius) / TERRITORY_CONFIG.trailWidth,
    /**
     * The head: a soft cube faked in 3D (`drawHeads.ts`). In trail widths: corner radius (and points per
     * corner), the sides' height (the top is raised that much above where the head is), light top edge, seam
     * between side faces, the soft outline (and how much darker than the head it is). `tilt`: the top squashed top to
     * bottom (seen at an angle); `light`: where light comes from (screen direction). Shadow: drop below the
     * cube's bottom and size, in half head widths. Eyes on the front face: size (share of the head's width), how
     * far apart and how low (shares of the face), their ink ring (trail widths), pupils' share, drop and
     * look into a turn; a blink shuts them by `blinkShut` and hides the pupils past `blinkPupilGone`. The crest (shares of the head's width): how far back on the top it stands, how
     * far apart its feathers start, their height, lean back (and how much of it shows when leaning toward or away from us), fan out, width and lighter middle's share;
     * each feather as [side (-1 left, 0 middle, 1 right), height share], drawn in order (middle last, on top).
     */
    head: {
      corner: 0.3,
      cornerPoints: 5,
      side: 0.5,
      edge: 0.06,
      seam: 0.02,
      outline: 0.045,
      outlineDarken: 0.5,
      tilt: 0.78,
      light: [-0.7, 0.7] as const,
      shadowDrop: 0.2,
      shadowWidth: 1.15,
      shadowHeight: 0.55,
      eyeSize: 0.115,
      eyeApart: 0.255,
      eyeLow: 0.5,
      eyeRing: 0.035,
      pupilShare: 0.55,
      pupilDown: 0.2,
      lookAside: 0.35,
      blinkShut: 0.9,
      blinkPupilGone: 0.5,
      crest: {
        at: 0.14,
        base: 0.1,
        height: 0.44,
        lean: 0.26,
        leanDepth: 0.3,
        fan: 0.2,
        width: 0.15,
        shine: 0.42,
        feathers: [
          [-1, 0.72],
          [1, 0.72],
          [0, 1],
        ] as const,
      },
    },
    /**
     * How the head looks as it goes (`headMotion.ts`; looks only, never where it is): how fast the eyes
     * follow a turn (half-life), and its blinks: every so often (random per player, ms) and how long.
     * It only hops for joy, each a fixed animation: a medium capture, a large one (a small one has none),
     * a knockout (with a full spin): its height (trail widths), how long it lasts and how many turns it
     * spins. Its shadow shrinks by `shadowShrink` per head width of height.
     */
    headMotion: {
      lookHalfLifeMs: 80,
      blinkEveryMs: [2_200, 5_500] as const,
      blinkMs: 150,
      hops: {
        medium: { height: 0.4, ms: 400, spins: 0 },
        large: { height: 0.6, ms: 480, spins: 0 },
        knockout: { height: 0.7, ms: 600, spins: 1 },
      },
      shadowShrink: 0.7,
    },
    /**
     * A head moving through its own land kicks up sand behind it (Paper.io's looks like water; owner: ours
     * like sand, "just slightly"): one soft puff every `everyMs` while it moves, `behind` trail widths back and
     * up to `spread` to either side, growing from `from` to `to` trail widths across, drifting `drift` aside
     * and fading from `alpha` over `lifeMs`, in its land's color lightened by `lighten`. With each puff two
     * grains (`grains`) flick out, one to each side (`out`) and a little back (`back`), `reach` trail widths
     * in a hop `hop` high, `size` across, fading from `alpha` over `lifeMs`: one light (the puff's shade), one
     * darker (`darken`; owner: a little fewer, so every `darkEvery`th puff has none). Everyone's heads, on the phone only.
     */
    wake: {
      everyMs: 90,
      lifeMs: 420,
      behind: 0.5,
      spread: 0.25,
      from: 0.5,
      to: 1.1,
      drift: 0.3,
      alpha: 0.5,
      lighten: 0.35,
      grains: { lifeMs: 320, out: 0.8, back: 0.5, reach: 0.7, hop: 0.3, size: 0.13, alpha: 0.9, darken: 0.15, darkEvery: 3 },
    },
    outline: 0.07,
    /** Trail: inside lighter than the land, edged in the player's color. */
    trailInnerShare: 0.62,
    trailLighten: 0.45,
    /** The arena floor's dot grid, in trail widths. */
    floorDotGap: 2,
    floorDotRadius: 0.07,
    /** The arena wall: its ink line's thickness, in trail widths (the same all around). */
    wallLine: 0.15,
    /** New land flashes white, then fades. */
    captureFlashMs: 450,
    captureFlashAlpha: 0.75,
    /**
     * Your own new land fills in (like Paper.io's): it shows at once in a pale shade of your color
     * (`paleLighten`) and holds `holdMs`, then your color spreads across it from where your head got home
     * over `sweepMs`, slowing as it goes. A light shine (`shineLighten`) runs `shineBand` trail widths deep
     * just behind the front, and fades over `fadeMs` once the color is everywhere.
     */
    captureFill: { paleLighten: 0.6, holdMs: 60, sweepMs: 270, shineLighten: 0.35, shineBand: 3, fadeMs: 300 },
    /** A head bursting when its player goes out. */
    burstMs: 700,
    /**
     * Before it bursts (knocked out, not quitting), the head spins, pops up and shrinks: how long, how many
     * turns, how high (trail widths) and how much smaller it ends (share of its size); then it bursts there.
     */
    outSpin: { ms: 380, turns: 2, lift: 0.9, shrink: 0.45 },
    /**
     * The crown on the head of whoever leads in land during the match (no one while it's a tie): one gold
     * ring faked in 3D like the head (`drawCrown.ts`; owner: like Paper.io's, chunky, one piece, gold),
     * standing on the middle of the head's top with balls sitting on its rim, turning with the head. In
     * shares of the head's width: the ring's radius, its band's height, its wall's thickness, the balls'
     * radius. How far a ball's middle rises above the rim (share of its radius), how much of the band shows
     * as the inner wall at the back (share of the band), how many balls, how far the crown stands off the
     * top (trail widths), how much the head's top seen through it is shaded, how thick its soft outline
     * is (share of the head's) and how much darker than its gold. A crowned head wears it in place of its crest.
     */
    crown: { radius: 0.38, band: 0.2, wall: 0.11, ball: 0.105, ballRise: 0.45, innerWall: 0.55, balls: 5, gap: 0.01, holeDarken: 0.18, outline: 0.7, outlineDarken: 0.3 },
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
    /**
     * As it drops it spins (owner decision 2026-11-08): from the way it was heading, `winnerHeadSpins` full
     * turns plus the short way round to face us, slowing to a stop over `winnerHeadSpinMs`.
     */
    winnerHeadSpinMs: 900,
    winnerHeadSpins: 1,
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
  /**
   * A capture's size (area in world units): from these on it's a medium and a large one (`captureSize.ts`).
   * The capture's sound and the head's hop for joy both go by it.
   */
  captureSize: {
    mediumArea: (11 * TERRITORY_CONFIG.trailWidth) ** 2,
    largeArea: (24 * TERRITORY_CONFIG.trailWidth) ** 2,
  },
  sound: {
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
    /** Changing to or from rival land (or starting) moves the trail there over this long, so it never clicks. */
    trailMoveMs: 150,
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
