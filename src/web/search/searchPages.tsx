import type { ReactElement } from "react";
import { GAMES, getGame } from "../../shared/games/catalog";
import { GAME_COPY } from "./content/gameCopy";
import { SEARCH_TEXT } from "./content/sharedCopy";
import { GAMES_INDEX_COPY, TOPIC_COPY } from "./content/topicCopy";
import { GamePage } from "./pages/GamePage";
import { GamesIndexPage } from "./pages/GamesIndexPage";
import { TopicPage } from "./pages/TopicPage";
import { GAMES_INDEX_PATH, gamePagePath, topicPagePath } from "./paths";
import { SITE } from "./site";
import { breadcrumbs, itemList, videoGame, webPage } from "./structuredData";
import type { NavLink } from "./types";

/** A page made for search, ready to render: its address, what Google shows, its body and its structured data. */
export interface SearchPage {
  path: string;
  title: string;
  description: string;
  body: ReactElement;
  structuredData: readonly Record<string, unknown>[];
  note?: string;
}

const HOME = { name: SITE.name, path: "/" };
const GAMES_CRUMB = { name: SEARCH_TEXT.allGames.charAt(0) + SEARCH_TEXT.allGames.slice(1).toLowerCase(), path: GAMES_INDEX_PATH };

const TOPICS = [TOPIC_COPY.gamePigeon, TOPIC_COPY.differentPhones, TOPIC_COPY.roomCodes];
const TOPIC_LINKS: Record<(typeof TOPICS)[number]["slug"], string> = {
  "game-pigeon-for-android": "GamePigeon for Android",
  "2-player-games-on-different-phones": "2 player games on different phones",
  "games-with-room-codes": "Games with room codes",
};

/** The footer's links: the same on every page, so every page links to every other. */
export const FOOTER_PAGES: readonly NavLink[] = [
  { label: GAMES_CRUMB.name, href: GAMES_INDEX_PATH },
  ...TOPICS.map((topic) => ({ label: TOPIC_LINKS[topic.slug], href: topicPagePath(topic.slug) })),
];
export const FOOTER_GAMES: readonly NavLink[] = GAMES.map((game) => ({ label: game.name, href: gamePagePath(game.id) }));

/** Every page made for search: the games index, one page per game, and the topic pages. */
export function searchPages(): SearchPage[] {
  const index: SearchPage = {
    path: GAMES_INDEX_PATH,
    title: GAMES_INDEX_COPY.title,
    description: GAMES_INDEX_COPY.description,
    body: <GamesIndexPage />,
    structuredData: [
      webPage(GAMES_INDEX_PATH, GAMES_INDEX_COPY.title, GAMES_INDEX_COPY.description),
      breadcrumbs([HOME, GAMES_CRUMB]),
      itemList(GAMES.map((game) => ({ name: game.name, path: gamePagePath(game.id) }))),
    ],
  };
  const games = GAMES.map((game): SearchPage => {
    const copy = GAME_COPY[game.id];
    const path = gamePagePath(game.id);
    return {
      path,
      title: copy.title,
      description: copy.description,
      body: <GamePage id={game.id} />,
      structuredData: [
        webPage(path, copy.title, copy.description),
        breadcrumbs([HOME, GAMES_CRUMB, { name: getGame(game.id).name, path }]),
        videoGame(getGame(game.id), path, copy.description),
      ],
    };
  });
  const topics = TOPICS.map((copy): SearchPage => {
    const path = topicPagePath(copy.slug);
    return {
      path,
      title: copy.title,
      description: copy.description,
      body: <TopicPage copy={copy} />,
      structuredData: [webPage(path, copy.title, copy.description), breadcrumbs([HOME, { name: TOPIC_LINKS[copy.slug], path }])],
      ...("note" in copy && { note: copy.note }),
    };
  });
  return [index, ...games, ...topics];
}
