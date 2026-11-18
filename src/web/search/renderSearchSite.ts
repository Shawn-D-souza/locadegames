import { searchDocument, type PageAssets } from "./searchDocument";
import { searchPages } from "./searchPages";
import { siteUrl } from "./site";

/**
 * The pages made for search, rendered to plain HTML when the site is built (`scripts/searchPagesPlugin.ts`) and served
 * by the dev server: each as `<path>index.html`, and the sitemap listing them with the home page.
 */
export function renderSearchSite(assets: PageAssets): { path: string; html: string }[] {
  return searchPages().map((page) => ({ path: page.path, html: searchDocument(page, assets) }));
}

export function sitemapXml(): string {
  const urls = ["/", ...searchPages().map((page) => page.path)].map((path) => `  <url>\n    <loc>${siteUrl(path)}</loc>\n  </url>`);
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join("\n")}\n</urlset>\n`;
}
