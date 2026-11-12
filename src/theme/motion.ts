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
} as const;

export const easings = {
  spring: "cubic-bezier(0.34, 1.56, 0.64, 1)",
  out: "cubic-bezier(0.22, 1, 0.36, 1)",
  /** Dots Clash: a dot flying to the next tile, launching quickly and easing into its landing. */
  flight: "cubic-bezier(0.4, 0, 0.2, 1)",
} as const;

export const transforms = {
  pressScale: 0.92,
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
} as const;
