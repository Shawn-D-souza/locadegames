/** Corner radii, outlines and lip shadows (DESIGN.md §4). */
export const radii = {
  pill: 999,
  /** Buttons and input fields. */
  control: 16,
  tile: 16,
  /** Small squares inside game tile art (the thumbnail's board cells). */
  artCell: 6,
  card: 28,
  panel: 40,
} as const;

export const strokes = {
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
} as const;
