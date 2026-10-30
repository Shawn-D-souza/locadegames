/**
 * The celebration styles the preview page compares. C (all in) is the one in the match screen (owner decision).
 * All of them land the last move with a thump and a short freeze before the burst.
 */
export interface CelebrationStyle {
  name: string;
  /** Turning sun rays in the winner's color behind the board. */
  rays: boolean;
  /** Fluttering canvas confetti out of the board. */
  confetti: boolean;
  /** Sparks thrown off the win line as it draws. */
  sparks: boolean;
  /** A ring of stars where the result tag lands. */
  stars: boolean;
  markMotion: "glow" | "hop";
  /** The pieces on the cards react: happy spinning jump, sad droop, draw shrug. */
  pieceMotion: boolean;
  countUp: boolean;
}

export const CELEBRATION_STYLES = {
  a: {
    name: "A · ARCADE",
    rays: true,
    confetti: true,
    sparks: false,
    stars: false,
    markMotion: "hop",
    pieceMotion: true,
    countUp: false,
  },
  b: {
    name: "B · PUNCHY",
    rays: false,
    confetti: false,
    sparks: true,
    stars: true,
    markMotion: "glow",
    pieceMotion: true,
    countUp: true,
  },
  c: {
    name: "C · ALL IN (IN GAME)",
    rays: true,
    confetti: true,
    sparks: true,
    stars: true,
    markMotion: "hop",
    pieceMotion: true,
    countUp: true,
  },
} as const satisfies Record<string, CelebrationStyle>;

export type CelebrationStyleId = keyof typeof CELEBRATION_STYLES;
