import { colors, getPlayerColor, strokes } from "../../../theme";

/** Pool's client-only numbers: the table's drawing (in table units, like the physics), the cue, the aim and the playback. */
export const POOL_LOOK = {
  /** The rail round the cloth (table units; thin, so the cloth gets the screen). No cushions drawn (owner direction): the rail meets the cloth. Holds the holes (`POOL_CONFIG.pockets`). */
  rail: 3.6,
  /** The cue: how long and thick it is (table units), its tip's length, and the gap it keeps behind the cue ball at rest. */
  cueLength: 44,
  cueTip: 0.7,
  cueButt: 1.5,
  cueTipLength: 0.9,
  cueGap: 0.6,
  /** Pulling the cue back this far (table units) is full power; the cue follows your finger back, up to it. */
  fullPull: 22,
  /** Where a touch takes hold of the cue: this close to the stick (either side), or to the cue ball's middle. Held, moving this far decides: sideways turns it, back along it pulls. */
  grip: 4.5,
  gripBall: 3.2,
  gripDecide: 1.2,
  /**
   * The other way to take hold (owner decision, for a ball in a corner with no room behind it): a finger held still this
   * long anywhere (moving less than `gripDecide`) takes hold of the cue, to pull straight back from there.
   */
  longPressMs: 350,
  /** A long press took hold: the cue twitches back this far (table units) and straight back in, over this long (owner direction: a small nudge, nothing that stays). */
  holdTwitch: 0.5,
  holdTwitchMs: 160,
  /** The strike: the cue holds still, then rushes in over this last share of the lead (`POOL_CONFIG.leadMs`). */
  strikeShare: 0.35,
  /** A potted ball sinks into its pocket over this long, shrinking by this share; a ball put back pops on, overshooting a little. */
  dropMs: 180,
  dropShrink: 0.7,
  popOvershoot: 1.7,
  /** The white dot on your own balls, as a share of the ball's radius. */
  myDot: 0.36,
  /** Your aim: touching this close to the cue ball (table units) doesn't turn the cue (too fiddly to point from there). */
  aimDeadZone: 2.5,
  /** A pull shorter than this share of a full one is no shot: push the cue back in and let go to change your mind. */
  powerDeadZone: 0.05,
} as const;

/** Pool's colors, all from the theme: everyone's balls in their own color. */
export const POOL_PAINT = {
  cloth: colors.poolCloth,
  rail: colors.poolRail,
  railEdge: colors.ink,
  pocket: colors.poolPocket,
  black: colors.poolBlack,
  cueBall: colors.white,
  outline: colors.ink,
  dot: colors.white,
  shaft: colors.poolCueShaft,
  tip: colors.ink,
  label: colors.ink,
  outlineWidth: strokes.thin,
} as const;

/** A seat's balls are its player's color. */
export const ballColor = (playerId: number) => getPlayerColor(playerId).base;
