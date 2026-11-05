/**
 * Territory's gameplay numbers. World units are integers: one trail is 1,000 units wide,
 * so polygon math stays exact (Clipper2 on integer coordinates) and positions fit in 32 bits.
 */
export const TERRITORY_CONFIG = {
  minPlayers: 2,
  /** Simulation steps per second; the server sends one snapshot per step. */
  tickRate: 20,
  tickMs: 50,
  /** Frozen on the start positions this long before the first step (3, 2, 1). */
  countdownMs: 3_000,
  /** Longest a match runs; it ends earlier once only one player is left. */
  matchMs: 180_000,

  /** Width of a trail; also the unit every other size is measured in. */
  trailWidth: 1_000,
  /** Heads are solid discs this big: two heads never come closer than twice this. Half the drawn head, so drawn heads touch, never overlap. */
  headRadius: 600,
  /** Distance a head travels per step (6.4 trail widths a second). */
  speedPerStep: 320,
  /** Headings are whole steps of a full turn, so movement is exact integer math on every device. */
  angleSteps: 4_096,
  /** Fastest turn per step: a full circle in about 0.7 s, so a U-turn is a tight arc. */
  turnPerStep: 280,

  /** Arena radius grows with the player count: base + perPlayer × √players. */
  arenaBaseRadius: 20_000,
  arenaRadiusPerSqrtPlayer: 15_000,
  /** Corners of the round arena's polygon (its edge sags under 3 units between them). */
  arenaVertices: 360,
  /** Players start evenly spaced on a ring this far out (share of the arena radius). */
  spawnRingRatio: 0.55,
  /** Starting land: a disc this big around each start position. */
  startLandRadius: 3_000,
  startLandVertices: 48,

  /** A head cuts a trail when its center comes this close to the trail's center line: the head's edge touching the trail's edge (head radius + half a trail width). */
  cutReach: 1_100,
  /** The newest stretch of a trail, under its owner's own head, cannot be cut. */
  headGraceLength: 1_000,
  /** Trail points this close to the wall count as touching it, so captures there reach the arena's edge. */
  wallContactSlack: 4,
  /** Width of the band just inside the wall used to tell which open areas touch the wall. */
  wallBandWidth: 3,
  /** Land left thinner than this after someone's capture vanishes (nobody can stand on it, and it is hard to even see). */
  minLandThickness: 400,
  /** A point this close to a piece of land counts as on it (trail starts sit exactly on the edge, rounded). */
  anchorSlack: 4,
  /** Largest gap allowed between the true arc and its polygon when a trail's rounded edges turn into land. */
  arcTolerance: 8,
} as const;

export const TERRITORY_TICKS = {
  /** Steps in a full-length match. */
  matchTicks: TERRITORY_CONFIG.matchMs / TERRITORY_CONFIG.tickMs,
} as const;
