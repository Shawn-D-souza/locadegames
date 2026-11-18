import { SITE } from "../site";

/** How to start, the same on every page; the last step names the game when there is one. */
export function howToSteps(gameName?: string): readonly string[] {
  return [
    `Open ${SITE.host} on your phone and tap CREATE ROOM.`,
    "Share the 6-digit code or the link. Friends open it on their own phones: iPhone or Android, no app, no sign-up.",
    gameName ? `Tap ${gameName} and the game starts for everyone.` : "Pick a game and it starts for everyone.",
  ];
}

/** The short promise under every page's heading. */
export const PROMISE = ["Free", "No app", "No sign-up", "iPhone + Android"] as const;

/** The pages' labels and buttons. */
export const SEARCH_TEXT = {
  play: "PLAY NOW",
  howTo: "HOW TO PLAY WITH FRIENDS",
  rules: "THE RULES",
  players: "PLAYERS",
  questions: "QUESTIONS",
  moreGames: "MORE GAMES",
  allGames: "ALL GAMES",
  home: "Locade Games home",
  footerPages: "Pages",
  footerGames: "Games",
} as const;
