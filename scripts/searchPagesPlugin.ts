import { existsSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { runnerImport, type Plugin } from "vite";

/** What `src/web/search/renderSearchSite.ts` gives (typed here: the page code is JSX, which the config's TypeScript doesn't compile). */
interface Source {
  renderSearchSite(assets: { stylesheets: readonly string[]; scripts: readonly string[] }): { path: string; html: string }[];
  sitemapXml(): string;
}

/**
 * The pages made for search (`src/web/search/`): plain HTML with no JavaScript, made when the site is built, each as
 * `<path>/index.html` beside the app, plus `sitemap.xml` listing them. They link the app's own stylesheet (read from
 * the built `index.html`), so they look like the app. In development they're served from the code as it is, styled
 * through `devStyles.ts`. The page code is loaded through Vite's module runner, so it stays out of the config.
 */

const SOURCE = fileURLToPath(new URL("../src/web/search/renderSearchSite.ts", import.meta.url));
/** Path of the dev-only module that brings the app's styles, from the Vite root (`src/web`). */
const DEV_STYLES = "/search/devStyles.ts";
const STYLESHEET = /<link rel="stylesheet"[^>]*href="([^"]+)"/g;
/** The game pictures a page shows (`npm run search-art` makes them). */
const ART = /<img src="(\/art\/[^"]+)"/g;

/** JSX without the React plugin: the runner compiles the page code on its own. */
const RUNNER_CONFIG = { configFile: false as const, logLevel: "silent" as const, oxc: { jsx: { runtime: "automatic" as const } } };

export function searchPages(): Plugin {
  let root = process.cwd();
  let outDir = "dist";

  return {
    name: "locade-search-pages",
    configResolved(config) {
      root = config.root;
      outDir = config.build.outDir;
    },
    async writeBundle(_options, bundle) {
      const index = bundle["index.html"];
      const html = index?.type === "asset" ? String(index.source) : "";
      const stylesheets = [...html.matchAll(STYLESHEET)].map((match) => match[1]!);
      if (stylesheets.length === 0) throw new Error("Search pages: no stylesheet found in the built index.html.");
      const { module } = await runnerImport<Source>(SOURCE, { root, ...RUNNER_CONFIG });
      const pages = module.renderSearchSite({ stylesheets, scripts: [] });
      for (const page of pages) {
        const file = join(outDir, page.path, "index.html");
        await mkdir(dirname(file), { recursive: true });
        await writeFile(file, page.html);
      }
      await writeFile(join(outDir, "sitemap.xml"), module.sitemapXml());
      const pictures = new Set(pages.flatMap((page) => [...page.html.matchAll(ART)].map((match) => match[1]!)));
      const missing = [...pictures].filter((path) => !existsSync(join(outDir, path)));
      if (missing.length > 0) throw new Error(`Search pages: no picture for ${missing.join(", ")}; run npm run search-art.`);
    },
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const path = (req.url ?? "").split("?")[0]!;
        // Only addresses a page could have (no file extension, not the app's home or Vite's own), or the sitemap.
        if (path === "/" || path.startsWith("/@") || path.startsWith("/api/") || (/\.[a-z0-9]+$/i.test(path) && path !== "/sitemap.xml")) return next();
        void (async () => {
          const module = (await server.ssrLoadModule(SOURCE)) as Source;
          if (path === "/sitemap.xml") {
            res.setHeader("Content-Type", "application/xml");
            return res.end(module.sitemapXml());
          }
          const wanted = path.endsWith("/") ? path : `${path}/`;
          const page = module.renderSearchSite({ stylesheets: [], scripts: [DEV_STYLES] }).find((p) => p.path === wanted);
          if (!page) return next();
          res.setHeader("Content-Type", "text/html");
          res.end(await server.transformIndexHtml(wanted, page.html));
        })().catch(next);
      });
    },
  };
}
