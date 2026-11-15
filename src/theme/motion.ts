/** Motion tokens (DESIGN.md §8): quick and springy, never slow fades. */
export const durations = {
  fast: 150,
  normal: 200,
  slow: 250,
  /** Gentle repeating pulse for live matches (DESIGN.md §8). */
  pulse: 1_000,
  /** The line drawn through a winning row. */
  lineDraw: 400,
  /** Winning marks bounce, the winner's card pops, a draw shakes. */
  celebrate: 500,
  /** Results: the wait before the champion card pops in, and between confetti waves. */
  stagger: 350,
  /** Confetti falling once over the champion screen. */
  confetti: 2_800,
  /** Hit-stop: the winning move holds still this long before the celebration bursts. */
  freeze: 300,
  /** One full turn of the sun rays behind a winning board. */
  rays: 12_000,
  /** A piece's happy jump (squash, stretch, land) or a loser's droop. */
  hop: 600,
  /** Gap between the winning marks' jumps, one after the other along the line. */
  hopStagger: 90,
  /** Points ticking up on the result tag. */
  countUp: 500,
  /** One hop of the loading dots (joining a room). */
  dotHop: 400,
  /**
   * Sea Battle: the other's cannon swinging onto the cell before it fires (yours follows your finger), a cannonball's
   * flight, how long its splash or blast shows before the boards trade places (after a miss), and the boards trading
   * places and sizes.
   */
  cannonTurn: 240,
  shotFlight: 560,
  shotSettle: 650,
  boardSwap: 520,
  /** Sea Battle: one puff of smoke drifting off a hit or a wreck. */
  smoke: 3_600,
  /**
   * 4 in a Row: a disc falling the whole board (from above it to the bottom row); a shorter fall takes less, as under
   * gravity. It lands before the ending's thump (`slow`), so the last disc is down when the board thumps.
   */
  discFall: 190,
  /** 4 in a Row: once landed, a disc bounces up, lands again, bounces a little and settles (owner direction: it bounces at the bottom). */
  discBounce: 420,
  /** Checkers: a piece sliding one square, or jumping two (a chain of jumps takes one each). */
  checkerHop: 180,
  /** Checkers: a jumped piece shrinking away as the jumping piece passes over it. */
  checkerTaken: 220,
} as const;

export const easings = {
  spring: "cubic-bezier(0.34, 1.56, 0.64, 1)",
  out: "cubic-bezier(0.22, 1, 0.36, 1)",
  /** Dots Clash: a dot flying to the next tile, launching quickly and easing into its landing. */
  flight: "cubic-bezier(0.4, 0, 0.2, 1)",
  /** Sea Battle: a cannonball thrown up, slowing to the top of its arc, then falling faster and faster. */
  rise: "cubic-bezier(0.3, 0.6, 0.6, 1)",
  fall: "cubic-bezier(0.45, 0, 0.75, 0.45)",
  /** 4 in a Row: a disc dropped from rest, faster and faster until it lands (gravity). */
  drop: "cubic-bezier(0.55, 0.085, 0.68, 0.53)",
} as const;

export const transforms = {
  pressScale: 0.92,
  /** Checkers: how much a jumping piece grows at the top of its jump, as if lifted off the board. */
  checkerJumpLift: 1.18,
  popFromScale: 0.6,
  badgeTilt: "-15deg",
  celebrateScale: 1.15,
  /** Squash and stretch for jumping pieces: wide and flat on take-off and landing, tall in the air. */
  squash: 0.8,
  stretch: 1.2,
  /** How high a happy piece jumps, as a share of its own size. */
  hopHeight: "-35%",
  /** A loser's piece tips over this far. */
  droopTilt: "18deg",
  /** The board's thump when the winning move lands. */
  impactScale: 0.97,
  /** A draw's shrug rocks the piece this far each way. */
  shrugTilt: "6deg",
  /** The winner's card stays this much bigger after its bounce. */
  winScale: 1.05,
  /** YOU WIN! / DRAW! slam in from this size. */
  stampFromScale: 2.2,
  /** A small board's big mark stamps on from this size (Ultimate Tic-tac-toe): smaller than a result's, it happens often. */
  claimFromScale: 1.6,
  /** YOU WIN! sits slightly tilted, like a stamp. */
  stampTilt: "-6deg",
  confettiSpin: "720deg",
  /** How high a loading dot hops, as a share of its own size. */
  dotHopHeight: "-100%",
  /** Dots Clash: whose turn it is stands this much bigger in the row above the board. */
  turnScale: 1.25,
  /** Dots Clash: how high whose-turn's tile hops above the board, as a share of its own size. */
  turnHopHeight: "-30%",
  /** Dots Clash: a flying dot grows this much at the top of its arc, as if lifted off the board. */
  flightScale: 1.35,
  /** Dots Clash: a tile's dots settle from this size when a dot lands on it (no fade, so nothing flickers). */
  landFromScale: 1.3,
  /** Sea Battle: a cannonball grows this much at the top of its arc (seen from above), and how far a cannon kicks back as it fires (a share of its size). */
  shotArcScale: 1.5,
  recoil: "9%",
  /**
   * Sea Battle: how high a cannonball rises on screen at the top of its arc (a share of its own size), how small its
   * shadow on the water gets then, and how a cannon squashes as it fires (then swells a little and settles).
   */
  shotLift: "-260%",
  shotShadowScale: 0.55,
  kickScale: 0.88,
  /** Sea Battle: how far a puff of smoke drifts off its wreck (a share of its own size: up and a little to the side). */
  smokeDriftX: "40%",
  smokeDriftY: "-170%",
  /** 4 in a Row: a disc landing squashes this wide and flat, bounces up this far (a share of its size), then a smaller bounce, and settles. */
  discSquashX: 1.1,
  discSquashY: 0.88,
  discBounce: "-24%",
  discBounceSmall: "-8%",
} as const;
