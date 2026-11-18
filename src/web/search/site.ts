/**
 * The site as search engines are given it: every page's canonical address starts with `origin` (the same as
 * `index.html`'s canonical, `robots.txt` and the structured data there). Change it with the domain (CLAUDE.md, Domain).
 */
export const SITE = {
  origin: "https://locade.pages.dev",
  host: "locade.pages.dev",
  name: "Locade Games",
  /** The link preview image (1200 × 630), also the pages' structured-data image. */
  image: "/og-image.png",
  imageAlt: "Locade Games logo: an X, an O, a pawn and a die",
} as const;

/** A page's full address. */
export function siteUrl(path: string): string {
  return `${SITE.origin}${path}`;
}
