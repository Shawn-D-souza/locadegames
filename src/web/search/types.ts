import type { GameId } from "../../shared/games/catalog";

/** A question people search for, answered on the page. */
export interface Faq {
  question: string;
  answer: string;
}

/** What a game's page made for search says (its rules come from the game's doc in `docs/games/`). */
export interface GamePageCopy {
  /** Its address: `/games/<slug>/`. */
  slug: string;
  /** The `<title>`, shown as the result's headline in Google. */
  title: string;
  /** The meta description, shown under it. */
  description: string;
  /** The page's one `<h1>`. */
  heading: string;
  /** The opening paragraphs. */
  intro: readonly string[];
  /** How it's played, one rule a line. */
  rules: readonly string[];
  faq: readonly Faq[];
  /** Games linked at the bottom. */
  related: readonly GameId[];
}

/** One part of a topic page: a card with its heading, its paragraphs, and games to link to. */
export interface TopicSection {
  heading: string;
  paragraphs: readonly string[];
  games?: readonly GameId[];
  /** Rows of a two-column comparison, the first row its column names. */
  table?: readonly (readonly [string, string, string])[];
}

/** A page made for a search that isn't one game ("2 player games on different phones"). */
export interface TopicPageCopy {
  /** Its address: `/<slug>/`. */
  slug: string;
  title: string;
  description: string;
  heading: string;
  intro: readonly string[];
  sections: readonly TopicSection[];
  faq: readonly Faq[];
  /** A small line at the very bottom (GamePigeon's: not affiliated). */
  note?: string;
}

/** A link in a page's footer. */
export interface NavLink {
  label: string;
  href: string;
}
