import { renderToStaticMarkup } from "react-dom/server";
import { colors } from "../../theme";
import { SearchFrame } from "./components/SearchFrame";
import { FOOTER_GAMES, FOOTER_PAGES, type SearchPage } from "./searchPages";
import { SITE, siteUrl } from "./site";
import { jsonLdScript } from "./structuredData";

/** What a page links besides itself: the app's stylesheet when built; in development, a script that brings the styles. */
export interface PageAssets {
  stylesheets: readonly string[];
  scripts: readonly string[];
}

const ESCAPES: Record<string, string> = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" };
const escape = (text: string) => text.replace(/[&<>"]/g, (char) => ESCAPES[char]!);

/** A whole page as HTML: its head (title, description, canonical, link preview, structured data) and its body, no JavaScript. */
export function searchDocument(page: SearchPage, assets: PageAssets): string {
  const url = siteUrl(page.path);
  const body = renderToStaticMarkup(
    <SearchFrame pages={FOOTER_PAGES} games={FOOTER_GAMES} note={page.note}>
      {page.body}
    </SearchFrame>,
  );
  const head = [
    `<meta charset="UTF-8" />`,
    `<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />`,
    `<title>${escape(page.title)}</title>`,
    `<meta name="description" content="${escape(page.description)}" />`,
    `<meta name="theme-color" content="${colors.background}" />`,
    `<link rel="canonical" href="${url}" />`,
    `<link rel="icon" href="/favicon.ico" sizes="32x32" />`,
    `<link rel="icon" href="/logo.svg" type="image/svg+xml" />`,
    `<link rel="apple-touch-icon" href="/apple-touch-icon.png" />`,
    `<meta property="og:type" content="website" />`,
    `<meta property="og:site_name" content="${SITE.name}" />`,
    `<meta property="og:title" content="${escape(page.title)}" />`,
    `<meta property="og:description" content="${escape(page.description)}" />`,
    `<meta property="og:url" content="${url}" />`,
    `<meta property="og:image" content="${siteUrl(SITE.image)}" />`,
    `<meta property="og:image:width" content="1200" />`,
    `<meta property="og:image:height" content="630" />`,
    `<meta property="og:image:alt" content="${escape(SITE.imageAlt)}" />`,
    `<meta name="twitter:card" content="summary_large_image" />`,
    ...assets.stylesheets.map((href) => `<link rel="stylesheet" crossorigin href="${href}" />`),
    `<script type="application/ld+json">${jsonLdScript(page.structuredData)}</script>`,
    ...assets.scripts.map((src) => `<script type="module" src="${src}"></script>`),
  ];
  return `<!doctype html>\n<html lang="en">\n<head>\n${head.join("\n")}\n</head>\n<body>${body}</body>\n</html>\n`;
}
