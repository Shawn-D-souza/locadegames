import { colors, getPlayerColor, opacity, strokes } from "../../../theme";

/** Carrom's client-only numbers: the board's drawing (in board units, like the physics), the striker's controls and the playback. */
export const CARROM_LOOK = {
  /** The wood frame round the playing surface (board units). */
  frame: 5,
  /** Its corners' rounding, as a share of the frame. */
  frameRound: 0.9,
  /** The two lines along each baseline sit this far either side of the striker's middle (a striker apart), with a circle at each end. */
  baselineGap: 3.1,
  /** The middle's two rings (radius) and the arrows from each corner toward it: where they start and end along the diagonal (from the corner), and the arrowhead's size. */
  centreRing: 4.4,
  outerRing: 13,
  arrowFrom: 11,
  arrowTo: 31,
  arrowHead: 1.6,
  /** A coin's groove: a ring this share of its radius in. */
  groove: 0.62,
  /** Pulling back this far (board units) is full power; further still only steadies the aim. */
  fullPull: 22,
  /**
   * While you pull back (owner direction: only then): a band behind the striker, toward your finger, as wide as this
   * share of the striker where it leaves it, narrowing to a point; as long as the pull, up to `pullBandLength` past the
   * striker's edge at full power.
   */
  pullBandWidth: 0.8,
  pullBandLength: 16,
  /** A touch this close to the striker's middle takes hold of it (to slide it, or pull it back). Held, moving this far decides. */
  grip: 5,
  gripDecide: 1.2,
  /** Held by the striker, a first move this many times more along the baseline than across it slides it; anything else pulls. */
  slideBias: 2,
  /** A finger held still this long anywhere (moving less than `gripDecide`) takes hold of the striker, to pull back from there. */
  longPressMs: 350,
  /** A pull shorter than this share of a full one is no shot: push back in and let go to change your mind. */
  powerDeadZone: 0.05,
  /** A pocketed disc sinks into its hole over this long, shrinking by this share; a coin put back pops on, overshooting a little. */
  dropMs: 180,
  dropShrink: 0.7,
  popOvershoot: 1.7,
  /**
   * Someone else's shot reaches this phone a moment after it was flicked: it plays from the start this much faster
   * until it's level with the shooter's (so two phones side by side end together, and nothing jumps). Further behind
   * than `catchUpMaxMs` (a phone waking up), it jumps to where everyone is.
   */
  catchUp: 1.35,
  catchUpMaxMs: 1_200,
} as const;

/** Carrom's colors, all from the theme. The striker is in its shooter's color. */
export const CARROM_PAINT = {
  board: colors.carromBoard,
  frame: colors.carromFrame,
  frameEdge: colors.ink,
  line: colors.carromLine,
  pocket: colors.carromPocket,
  white: colors.white,
  black: colors.carromBlack,
  queen: colors.carromQueen,
  outline: colors.ink,
  groove: colors.ink,
  grooveOnDark: colors.white,
  grooveOpacity: opacity.groove,
  pullBandOpacity: opacity.pullBand,
  outlineWidth: strokes.thin,
} as const;

/** The striker is its shooter's color. */
export const strikerColor = (playerId: number) => getPlayerColor(playerId).base;
