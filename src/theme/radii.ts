/** Corner radii, outlines and lip shadows (DESIGN.md §4). */
export const radii = {
  pill: 999,
  /** Buttons and input fields. */
  control: 16,
  tile: 16,
  /** Small squares inside game tile art (the thumbnail's board cells). */
  artCell: 6,
  /** One small board inside Ultimate Tic-tac-toe's big one. */
  smallBoard: 12,
  card: 28,
  panel: 40,
} as const;

export const strokes = {
  /** The lines between the cells of a small board in a game tile's art. */
  hair: 1,
  /** Cards, buttons, inputs. */
  thin: 2,
  /** The field being edited. */
  outline: 3,
  outlineThick: 4,
  headerLine: 2,
  /** Dashed divider lines. */
  dash: 2,
} as const;

export const lips = {
  small: 3,
  medium: 6,
  large: 8,
} as const;

export const opacity = {
  disconnected: 0.4,
  disabled: 0.5,
  /** Secondary text on a colored background ("(YOU)" on a player bar). */
  secondary: 0.75,
  /** The loser's own card after a match: faded, not gone. */
  defeated: 0.6,
  /** Sun rays behind a winning board: present, never louder than the board. */
  rays: 0.45,
  /** The marks of a small board that is won or full (Ultimate Tic-tac-toe): there, but out of play. */
  closedBoard: 0.35,
  /** Where the other player must play (Ultimate Tic-tac-toe): shown steadily, lighter than your own blinking one. */
  targetWaiting: 0.55,
  /** Sea Battle: a puff of smoke at its thickest (quiet: it only looks good). */
  smoke: 0.6,
} as const;
