/**
 * Gameplay numbers for Carrom. Lengths are board units: the playing surface inside the frame is `board.size` square,
 * x to the right and y down as seen by the player on side 0 (the bottom). Times are seconds inside the simulation, ms on
 * screen.
 */
export const CARROM_CONFIG = {
  minPlayers: 2,
  /** At most 4 round one board (owner decision): one side each. */
  maxPlayers: 4,
  /** Each shot must be taken within this time, or the turn passes (owner decision: as in Pool, 30 s). */
  turnTimeMs: 30_000,
  /** Run out of time this many turns in a row and you're out, as if you'd quit (as in Pool). */
  missedTurnsOut: 3,
  /** Point carrom (owner decision): anyone may pocket any coin; a white is worth 20, a black 10, the queen 50 once covered. */
  points: { white: 20, black: 10, queen: 50 },
  /** The striker in a pocket costs this many points (owner decision: -10, and a score may go below 0). */
  foulPenalty: 10,
  /** 9 white and 9 black round the queen. */
  coinsEach: 9,

  board: { size: 100 },
  /** A coin's radius and the striker's: a little bigger than a real board's, so they read on a phone (real: 3.0 and 4.1 cm on 74). */
  coinRadius: 2.3,
  strikerRadius: 3.1,
  /** Space left between coins at the start, so none touch before the break. */
  coinGap: 0.02,
  /**
   * The four holes: each one's middle this far in from both walls of its corner (touching both), and its radius (owner
   * decision: 3.0, a real board's proportion to the coins; 3.4 was too easy). A disc whose middle gets over one drops,
   * unless it came too fast and off-centre (`rim`).
   */
  pocket: { inset: 3, radius: 3 },
  /**
   * Fast coins pop out (owner decision, to make potting take more care): a disc reaching a hole no faster than
   * `slowSpeed` (units / s) always drops; faster, its path must pass closer to the hole's middle, down to `fastShare` of
   * the radius at `fastSpeed` and up, or it clips the rim and bounces back out, keeping `bounce` of its speed into the
   * hole. Soft and medium aimed shots go in as before; only hard, slightly off-centre ones rattle out.
   */
  rim: { slowSpeed: 90, fastSpeed: 220, fastShare: 0.35, bounce: 0.5 },
  /**
   * Each side's baseline: the striker's middle sits this far in from that side's wall, anywhere up to `half` either side
   * of the middle; the two lines drawn either side of it are a striker apart.
   */
  baseline: { inset: 15, half: 30 },
  /** Shots go forward (owner decision: never back at coins behind you): at least this much of the direction toward the far side. */
  forwardMin: 0.06,

  physics: {
    /** Simulation steps per second: small enough steps that nothing passes through anything, even the striker at full speed into a coin coming the other way. */
    stepsPerSecond: 360,
    /**
     * The hardest flick's striker speed (units / s; owner direction: 300 was a little too fast); a shot's speed grows as
     * power^1.5, so the first half of the pull gives the soft shots room.
     */
    maxSpeed: 270,
    /** The softest shot still taken, as a share of the hardest. */
    minPower: 0.04,
    /** The powdered board slows a sliding disc: a steady part (units / s²) and a part growing with speed (per s). */
    friction: 28,
    drag: 0.22,
    /** A disc slower than this stops. */
    stopSpeed: 1,
    /** How much speed along the hit stays: disc on disc, disc on the frame. */
    discBounce: 0.9,
    wallBounce: 0.62,
    /** The striker is heavier than a coin (real: 15 g against 5.5 g). */
    strikerMass: 2.7,
    coinMass: 1,
    /** A shot never runs longer than this (seconds); whatever still moves then stops where it is. */
    maxSeconds: 20,
  },

  /**
   * After the discs stop, a beat for what follows on every phone (coins put back in the middle, the striker leaving the
   * board). The next turn's clock starts once the shot has played out. No lead before the strike (owner direction: your
   * shot starts on your phone the moment you let go).
   */
  settleMs: 450,
} as const;

/** How long a shot whose discs moved for `steps` simulation steps takes to play out on screen, in whole ms (slide, settle). */
export function shotMs(steps: number): number {
  return Math.round((steps * 1000) / CARROM_CONFIG.physics.stepsPerSecond + CARROM_CONFIG.settleMs);
}
