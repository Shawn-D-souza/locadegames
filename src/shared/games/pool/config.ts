/**
 * Gameplay numbers for Pool. Lengths are table units: the playing surface inside the cushions is `table.length` long
 * (x, from the head rail where the cue ball breaks to the foot rail behind the rack) and `table.width` wide (y). Times
 * are seconds inside the simulation, ms on screen.
 */
export const POOL_CONFIG = {
  minPlayers: 2,
  /** The first game with a cap (owner decision): at most 4 round one table. */
  maxPlayers: 4,
  /** Each shot must be taken within this time, or the turn passes with no foul (owner decision: 30 s). */
  turnTimeMs: 30_000,
  /**
   * Run out of time this many turns in a row and you're out, as if you'd quit (owner decision: so a game can't go on
   * forever with someone away or stalling; one shot taken starts the count again).
   */
  missedTurnsOut: 3,
  /**
   * Balls each, by players (owner decision): 7 for 2 (the classic 15-ball rack with the black), 4 for 3 and 3 for 4
   * (13 balls), so a game is about as long however many play, and the table never gets too crowded.
   */
  ballsEach: { 2: 7, 3: 4, 4: 3 } as Readonly<Record<number, number>>,

  table: {
    length: 100,
    width: 50,
    /** Where the cue ball breaks from, and where the rack's front ball (and a black put back) stands: on the long middle line. */
    headSpotX: 25,
    footSpotX: 75,
  },
  /** A ball's radius: a bit bigger than a real table's, so balls read on a phone. */
  ballRadius: 1.7,
  /** Space left between racked balls, so none touch before the break. */
  rackGap: 0.02,
  /**
   * Pockets: a corner's cushions stop this far from the corner along each rail, and a middle pocket's this far either
   * side of the middle (generous, about two balls wide: owner decision, no aim line, so potting stays fun). A ball
   * whose middle crosses a cushion's line through a pocket's mouth drops. The cushions' ends (the jaws) are round.
   */
  pockets: {
    cornerMouth: 5,
    sideMouth: 3.6,
    jawRadius: 0.5,
    /**
     * The round holes, drawn just as they are (owner direction: a ball must never look as if it floats over a hole): a
     * ball whose middle is over one drops, like on a real table, as does one whose middle leaves the cloth through a
     * mouth. How far each hole's middle sits out past the cloth's edge (diagonally at a corner) and its radius: wide
     * enough to reach past where a ball can leave the cloth between the jaws, and small enough to stay inside the rail
     * the phones draw (3.6).
     */
    corner: { out: 0.3, radius: 3.1 },
    side: { out: 0.8, radius: 2.6 },
  },

  physics: {
    /** Simulation steps per second: small enough steps that no ball passes through another or a jaw, even two at full speed head on. */
    stepsPerSecond: 360,
    /**
     * The hardest shot's cue ball speed (units / s: 2.6 table lengths a second; owner direction: 420 was too fast). A
     * shot's speed grows as power^1.5, so the first half of the pull gives the soft shots room (half power is about a
     * third of the speed).
     */
    maxSpeed: 260,
    /** The softest shot still taken, as a share of the hardest. */
    minPower: 0.04,
    /** The cloth slows a rolling ball: a steady part (units / s²) and a part growing with speed (per s); smooth, so slower shots still glide. */
    rolling: 10,
    drag: 0.14,
    /** A ball slower than this stops. */
    stopSpeed: 0.6,
    /** How much speed along the hit stays: ball on ball, ball on a cushion, ball on a jaw. */
    ballBounce: 0.94,
    cushionBounce: 0.72,
    jawBounce: 0.5,
    /** A shot never runs longer than this (seconds); whatever still moves then stops where it is. */
    maxSeconds: 20,
  },

  /**
   * How a shot plays out on every phone: the cue strikes (`leadMs`, which also covers the shot reaching the other
   * phones, so the balls start moving together on all of them), the balls roll for as long as the simulation says,
   * then a beat for what follows (the cue ball back after a scratch, the black back on its spot, a player's balls
   * leaving). The next turn's clock starts once it has played out.
   */
  leadMs: 350,
  settleMs: 450,
} as const;

/** How long a shot whose balls rolled for `steps` simulation steps takes to play out on screen, in whole ms (strike, roll, settle). */
export function shotMs(steps: number): number {
  return Math.round(POOL_CONFIG.leadMs + (steps * 1000) / POOL_CONFIG.physics.stepsPerSecond + POOL_CONFIG.settleMs);
}
