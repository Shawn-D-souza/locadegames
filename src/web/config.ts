/** Client-only numbers and build-time settings. */
export const CLIENT_CONFIG = {
  serverUrl: (import.meta.env.VITE_SERVER_URL as string | undefined)?.replace(/\/$/, "") ?? "",
  /** Automatic reconnect backoff; after the last one we show the RECONNECT modal. */
  reconnectDelaysMs: [500, 1_000, 2_000, 4_000, 8_000],
  toastDurationMs: 2_500,
  /** Voter avatars shown on a game tile; more show as "+n", so the tile never grows. */
  tileVotersShown: 3,
  copiedFeedbackMs: 1_500,
  /** Wait this long past a turn deadline before asking the server to play the auto move. */
  timeoutClaimGraceMs: 300,
  /** Ask again this often if the server says the turn is not over yet. */
  timeoutClaimRetryMs: 1_000,
  /** How often the turn countdown redraws. */
  timerTickMs: 100,
  /** The turn countdown stays hidden until this much time is left, so it doesn't distract. */
  countdownShowMs: 5_000,
  /** Pieces in the champion screen's confetti burst. */
  confettiPieces: 40,
  /** Canvas particles for celebrations (px, px/s, ms). One seeded pattern, so a replay looks the same. */
  particles: {
    seed: 7,
    gravity: 1_400,
    /** Share of speed kept per second (air drag). */
    drag: 0.35,
    confettiCount: 120,
    confettiSpeed: 1_100,
    confettiSize: 10,
    confettiLifeMs: 3_000,
    /** Paper flutters: it never falls faster than this, and sways side to side as it turns. */
    confettiFallSpeed: 240,
    confettiSway: 90,
    sparkCount: 36,
    sparkSpeed: 260,
    sparkSize: 5,
    sparkLifeMs: 450,
    starCount: 10,
    starSpeed: 520,
    starSize: 14,
    starLifeMs: 700,
  },
  /** A finished match stays on screen this long (celebration included), then moves on by itself; a tap skips it. */
  resultShowMs: 4_000,
  /**
   * The longest a match's ending waits for its board to show the move that ended it (Sea Battle's last ball: its
   * cannon turning and the flight take 0.8 s); past this it starts anyway, so an ending never hangs.
   */
  lastMoveWaitMs: 1_500,
} as const;
