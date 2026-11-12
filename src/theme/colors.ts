/** Brand, accent and status colors from DESIGN.md §2. Player colors live in players.ts. */
export const colors = {
  /** Deep indigo: text, outlines, button lips, the logo and the background dots. */
  ink: "#312C85",
  /** Disabled buttons. */
  inkMuted: "#9895C2",
  /** Placeholders and quiet icons. */
  inkSoft: "#ADABCE",
  /** Dashed dividers and light rules. */
  line: "#D6D5E7",
  /** Section labels on card edges ("ROOM", "PLAYERS (2)"). */
  sectionLabel: "#45556C",
  /** Secondary text ("OR", "(YOU)") and the edit pencil. */
  subtle: "#90A1B9",
  /** Main action buttons. A touch darker than the mockup's #FF6467 so white text reads. */
  coral: "#F25555",
  background: "#F1F5F9",
  white: "#FFFFFF",
  /** QR code modules: black on white scans most reliably. */
  black: "#000000",
  offGrayTrack: "#C7C9D9",
  offGrayKnob: "#5F6075",
  /** Ink at 60%, behind modals. */
  backdrop: "rgba(49, 44, 133, 0.6)",

  modeViolet: "#C23BE0",
  modeMagenta: "#E0308F",
  grassGreen: "#4A8C1C",
  /** Crowns in games (Territory's leader): a deep orange gold, and its bright yellow where light hits it. */
  gold: "#FF9A14",
  goldLight: "#FFE04A",
  /** Places on results tables: 2nd and 3rd (1st is gold). Ink text reads on both. */
  silver: "#D3D8E4",
  bronze: "#EBA46E",

  /**
   * Game worlds seen from the side (Head Crash): a pale lavender sky with softer hills far behind, the indigo
   * ground everything stands on (with darker pebbles), and royal-blue water (never a player color) with a pale crest.
   */
  sky: "#ECEAFB",
  skyHillFar: "#DEDAF6",
  skyHillNear: "#CFCAF0",
  ground: "#4E479F",
  groundPebble: "#3E388A",
  water: "#2F5FD8",
  waterCrest: "#9DB6F5",

  /** Dots Clash: the plain page under the board while it's someone else's turn (your own turn washes it in your color). */
  boardPage: "#E3E1F3",
  /** Dots Clash: the faint edge of an empty tile, so white tiles read on the plain page (owner direction: just a little). */
  tileEdge: "#C9C6E6",

  online: "#78C840",
  waiting: "#FFC02E",
  offline: "#8A94A6",
} as const;

export type ColorToken = keyof typeof colors;
