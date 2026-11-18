import type { GameInfo } from "../../shared/games/catalog";
import { ROOM_CONFIG } from "../../shared/rooms/config";
import { SITE, siteUrl } from "./site";

/** Schema.org data for search engines (JSON-LD), tied to the site described in `index.html`. */
type JsonLd = Record<string, unknown>;

const WEBSITE_ID = `${SITE.origin}/#website`;

export function webPage(path: string, title: string, description: string): JsonLd {
  return { "@type": "WebPage", "@id": `${siteUrl(path)}#page`, url: siteUrl(path), name: title, description, inLanguage: "en", isPartOf: { "@id": WEBSITE_ID } };
}

/** The trail Google can show above a result: Locade Games › Games › Chess. */
export function breadcrumbs(items: readonly { name: string; path: string }[]): JsonLd {
  return {
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({ "@type": "ListItem", position: index + 1, name: item.name, item: siteUrl(item.path) })),
  };
}

/** A game played free in the browser, by how many. */
export function videoGame(game: GameInfo, path: string, description: string): JsonLd {
  const most = game.format === "tournament" ? 2 : (game.maxPlayers ?? ROOM_CONFIG.maxPlayers);
  return {
    "@type": "VideoGame",
    name: game.name,
    url: siteUrl(path),
    description,
    image: siteUrl(SITE.image),
    playMode: "MultiPlayer",
    numberOfPlayers: { "@type": "QuantitativeValue", minValue: game.minPlayers, maxValue: most },
    gamePlatform: "Web browser",
    applicationCategory: "Game",
    operatingSystem: "Any",
    isAccessibleForFree: true,
    offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
    isPartOf: { "@id": WEBSITE_ID },
  };
}

/** The games index as a list of its pages. */
export function itemList(items: readonly { name: string; path: string }[]): JsonLd {
  return {
    "@type": "ItemList",
    itemListElement: items.map((item, index) => ({ "@type": "ListItem", position: index + 1, name: item.name, url: siteUrl(item.path) })),
  };
}

/** The whole graph as one `<script type="application/ld+json">` body, safe inside HTML. */
export function jsonLdScript(graph: readonly JsonLd[]): string {
  return JSON.stringify({ "@context": "https://schema.org", "@graph": graph }).replace(/</g, "\\u003c");
}
