// Makes the PNG icons and the link preview image from the logo (src/web/public/logo.svg), in the theme's colors and fonts.
// Run it again after changing the logo. Usage: npm run icons
import { readFile, writeFile } from "node:fs/promises";
import { chromium } from "playwright";
import { createServer } from "vite";

const PUBLIC = new URL("../src/web/public/", import.meta.url).pathname;
const FONTS = new URL("../node_modules/@fontsource/", import.meta.url).pathname;

/** Logo size as a share of the icon, on the pale page. Maskable icons keep it inside Android's 80% safe circle. */
const ICONS = [
  { file: "apple-touch-icon.png", size: 180, logo: 0.8 },
  { file: "icon-192.png", size: 192, logo: 0.8 },
  { file: "icon-512.png", size: 512, logo: 0.8 },
  { file: "icon-maskable-512.png", size: 512, logo: 0.6 },
];
const FAVICON_SIZE = 32;
const PREVIEW = { file: "og-image.png", width: 1200, height: 630 };

const vite = await createServer({ logLevel: "silent", server: { middlewareMode: true } });
const { colors, layout, fonts } = await vite.ssrLoadModule("/../theme/index.ts");
await vite.close();

const logo = await readFile(`${PUBLIC}logo.svg`, "utf8");
const logoUrl = `data:image/svg+xml;base64,${Buffer.from(logo).toString("base64")}`;
const font = async (path) => `data:font/woff2;base64,${(await readFile(FONTS + path)).toString("base64")}`;
const fontFaces = `
  @font-face { font-family: "Roboto Condensed"; font-weight: 800; src: url(${await font("roboto-condensed/files/roboto-condensed-latin-800-normal.woff2")}); }
  @font-face { font-family: "Roboto Mono"; font-weight: 700; src: url(${await font("roboto-mono/files/roboto-mono-latin-700-normal.woff2")}); }`;
const dotGrid = `background: ${colors.background} radial-gradient(circle, ${colors.ink} ${layout.dotRadius}px, transparent ${layout.dotRadius}px) 0 0 / ${layout.dotGap}px ${layout.dotGap}px;`;

const browser = await chromium.launch();
const page = await browser.newPage();

async function render(html, width, height, path, transparent = false) {
  await page.setViewportSize({ width, height });
  await page.setContent(`<!doctype html><style>${fontFaces} * { margin: 0; }</style>${html}`);
  await page.evaluate(() => globalThis.document.fonts.ready);
  return page.screenshot({ path, omitBackground: transparent });
}

for (const { file, size, logo: share } of ICONS) {
  const logoSize = Math.round(size * share);
  await render(
    `<div style="width:${size}px;height:${size}px;display:grid;place-items:center;background:${colors.background}"><img src="${logoUrl}" width="${logoSize}"></div>`,
    size,
    size,
    PUBLIC + file,
  );
  console.log("  ", file);
}

// favicon.ico for browsers without SVG favicons: one PNG inside an ICO wrapper.
const png = await render(`<img src="${logoUrl}" width="${FAVICON_SIZE}" style="display:block">`, FAVICON_SIZE, FAVICON_SIZE, undefined, true);
const ico = Buffer.alloc(22);
ico.writeUInt16LE(1, 2); // type: icon
ico.writeUInt16LE(1, 4); // one image
ico.writeUInt8(FAVICON_SIZE, 6);
ico.writeUInt8(FAVICON_SIZE, 7);
ico.writeUInt16LE(1, 10); // color planes
ico.writeUInt16LE(32, 12); // bits per pixel
ico.writeUInt32LE(png.length, 14);
ico.writeUInt32LE(22, 18); // image data offset
await writeFile(`${PUBLIC}favicon.ico`, Buffer.concat([ico, png]));
console.log("   favicon.ico");

await render(
  `<div style="width:${PREVIEW.width}px;height:${PREVIEW.height}px;${dotGrid};display:flex;align-items:center;justify-content:center;gap:64px">
    <img src="${logoUrl}" width="360">
    <div style="background:${colors.white};border:3px solid ${colors.ink};border-radius:28px;padding:40px 48px;color:${colors.ink}">
      <div style="font-family:${fonts.display};font-weight:800;font-size:112px;line-height:0.95;text-transform:uppercase">Locade<br>Games</div>
      <div style="font-family:${fonts.body};font-weight:700;font-size:30px;margin-top:24px;letter-spacing:0.02em">Quick games with friends.<br>Private rooms, on your phone.</div>
    </div>
  </div>`,
  PREVIEW.width,
  PREVIEW.height,
  PUBLIC + PREVIEW.file,
);
console.log("  ", PREVIEW.file);

await browser.close();
