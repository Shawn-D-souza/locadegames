/** 8px base unit (DESIGN.md §7). */
export const BASE_UNIT = 8;

export const spacing = {
  0: 0,
  1: BASE_UNIT * 0.5,
  2: BASE_UNIT,
  3: BASE_UNIT * 1.5,
  4: BASE_UNIT * 2,
  6: BASE_UNIT * 3,
  8: BASE_UNIT * 4,
  12: BASE_UNIT * 6,
} as const;

/** Screen widths for layout changes; `max-phone:` styles apply on screens narrower than a normal phone (small phones). */
export const breakpoints = {
  phone: 380,
} as const;

/** Screen heights for layout changes; `sideways:` styles apply in landscape no taller than this: a phone held sideways (not a laptop or tablet). */
export const screenHeights = {
  sideways: 540,
} as const;

/** Named sizes; Tailwind classes use the names (`min-h-tap`, `max-w-content`, `size-mark-badge`). */
export const layout = {
  /** Smallest tap target. */
  tap: 60,
  /** Screen side margin. */
  gutter: 16,
  /** Card inner padding. */
  card: 20,
  /** Dot-grid background: distance between dots and dot radius. */
  dotGap: 24,
  dotRadius: 1.5,
  /** Edit pencil inside the name field. */
  icon: 24,
  /** Square outlined icon buttons (back, settings, copy). */
  iconButton: 48,
  /** Largest the invite QR code gets; it also shrinks to fit short (landscape) screens. */
  qr: 320,
  /** Height the rest of the QR popup needs (margins, padding, title, CLOSE); the QR gets what's left of the screen. */
  qrReserve: 232,
  /** Widest the content column gets. */
  content: 560,
  /** Widest it gets for a board of small boards beside the seat cards (landscape: laptops, tablets). */
  contentWide: 960,
  /** Widest the game board gets. */
  board: 420,
  /** Widest a board of small boards gets (Ultimate Tic-tac-toe: 81 cells need the room). */
  boardLarge: 520,
  /** In landscape that board sits beside the seat cards (in a column this wide) and fits the screen's height, less this (margins and the result tag below it). */
  boardSide: 168,
  boardReserve: 72,
  /** Widest that board gets in landscape, where a laptop has the room. */
  boardWide: 720,
  /** Dots Clash in portrait: the board also fits the screen's height, less this (the players' row and the turn banner above it, the corner ✕ and margins). */
  partyReserve: 270,
  /** Dots Clash's big boards (8×8 and up) in landscape: the column beside the board for the players' row and the banner. */
  partySide: 240,
  /** White disc holding a player's X or O on their match card. */
  markBadge: 44,
  /** One confetti piece on the champion screen. */
  confetti: 10,
  avatar: 44,
  avatarSmall: 28,
  /** The champion's disc on the results card, the gold crown sitting on it, and the small one on 1st place in the table. */
  avatarHero: 64,
  crownHero: 44,
  crownSmall: 18,
  /** Game tiles reflow: two columns on phones, more on wider screens. */
  gameTile: 140,
  /** Settings switch: the pill track, its knob, and how far the knob slides. */
  toggle: 32,
  toggleTrack: 56,
  toggleKnob: 20,
  toggleTravel: 24,
  /** Settings slider: its track's height, its thumb, and the number beside it (wide enough for "100", so the slider never shifts). */
  sliderTrack: 12,
  sliderThumb: 32,
  sliderValue: 40,
  /** Real-time game overlay: the land table in the top corner, the countdown disc, the knockout notices (under the clock; fits beside the land table on a 320px phone). */
  hudPanel: 168,
  countdown: 128,
  hudFeed: 112,
  /** How high above the bottom the arena game's result tag sits (its center). */
  endTag: 120,
  /** Head Crash: a drive button in a bottom corner (the whole half of the screen around it takes the touch; in landscape it is also the width of the side columns) and the arrow on it. */
  driveButton: 72,
  driveIcon: 32,
  /** Head Crash: each driver's half of the score tab at the top (wide enough for two digits). */
  scoreSide: 64,
  /** Dev tool pages: a side panel (Head Crash's tuner). */
  devPanel: 300,
} as const;
