# Setup and deploy

What gets deployed:

| Piece | Where | Name |
|---|---|---|
| Web client (`src/web`) | Cloudflare Pages | `locadegames` → `https://locadegames.pages.dev` |
| Matchmaking Worker + `RegionServer` Durable Object + usage cron (`src/server`) | Cloudflare Workers | `locade-server` → `https://locade-server.<your-subdomain>.workers.dev` |
| Usage status | Workers KV | namespace bound as `USAGE` |

---

## 1. Run it locally

Needs Node.js 22 or newer.

```bash
npm install
cp .dev.vars.example .dev.vars   # local Worker settings (already gitignored)
npm run dev:server               # Worker + Durable Object on http://localhost:8787
npm run dev:web                  # web client on http://localhost:5173 (second terminal)
```

Open http://localhost:5173 in two browser tabs. Create a room in one tab, then join with the code in the other.

To test on a phone on the same Wi-Fi, run `npm run dev:web -- --host` and open the `Network:` URL it prints. Vite forwards `/api` to the local Worker, so nothing else needs changing.

Checks to run: `npm run check` (typecheck + lint + build) and `npm test`.

### Screenshots of every screen

`npm run screenshots` photographs every screen (including hard-to-reach ones like Servers full, Connection lost and the popups) at 7 sizes, from a small phone to desktop. Keep `npm run dev:server` running in another terminal. The first time, download its browser once: `npx playwright install chromium`.

The pictures land in `screenshots/` (one folder per size); open `screenshots/index.html` to see every screen with all sizes side by side. Each run deletes the previous set, so only the latest is kept. The folder is not committed to git.

---

## 2. Deploy the Worker (one time)

1. **Log in:** `npx wrangler login` (opens the browser; approve access).
2. **Create the KV namespace:** `npx wrangler kv namespace create USAGE`.
   Copy the `id` it prints into `wrangler.jsonc` (already done: `256ce48e…`). The id isn't secret, so it's fine to commit.
3. **Deploy:** `npm run deploy:server`.
   - The first time, Wrangler may ask you to pick a `workers.dev` subdomain. Choose one.
   - Note the URL it prints, e.g. `https://locade-server.<subdomain>.workers.dev`. You need it in step 3.
4. **Create an Analytics API token** (used by the usage cron):
   1. Cloudflare dashboard → profile icon (top right) → **My Profile** → **API Tokens** → **Create Token**.
   2. **Create Custom Token** → name it `locade-usage-read`.
   3. Permissions: **Account** → **Account Analytics** → **Read**.
   4. Account Resources: **Include** → your account.
   5. **Continue to summary** → **Create Token**, then copy the token. It's shown only once.
5. **Find your Account ID:** run `npx wrangler whoami`, or open **Workers & Pages** in the dashboard and copy **Account ID** from the right sidebar.
6. **Store both as Worker secrets:**
   ```bash
   npx wrangler secret put CF_API_TOKEN    # paste the token
   npx wrangler secret put CF_ACCOUNT_ID   # paste the account id
   ```
7. **Check the cron after about 10 minutes:** dashboard → **Workers & Pages** → `locade-server` → **Logs**. Look for a `usage check` line.
   - If any metric shows up under `failed`, or you see `usage metric … failed: …`, send me the exact error text. Cloudflare sometimes renames analytics fields, and that only switches off the one metric that failed.

---

## 3. Deploy the web client on Cloudflare Pages

1. Push the repo to GitHub.
2. Dashboard → **Workers & Pages** → **Create** → **Pages** → **Connect to Git** → choose the repo.
3. Build settings:
   - **Project name:** `locadegames`. If that name is taken, pick another and do step 5.
   - **Production branch:** `main`
   - **Framework preset:** None
   - **Build command:** `npm run build`
   - **Build output directory:** `dist/web`
   - **Root directory:** leave empty
4. **Environment variables** (set them for both Production and Preview):
   - `VITE_SERVER_URL` = the Worker URL from step 2.3, with no trailing slash.
5. **Save and Deploy.** Your site goes live at `https://<project>.pages.dev`.
   - If the project name isn't `locadegames`, edit `ALLOWED_ORIGINS` in `wrangler.jsonc` to `https://<project>.pages.dev,https://*.<project>.pages.dev`, then run `npm run deploy:server` again.
6. Test it: open the site on two devices, create a room on one, and join from the other with the code or the INVITE link.

From now on, every push to `main` redeploys the site, and other branches get preview URLs.

---

## 4. Automatic Worker deploys (we'll set this up together)

Plan: use Cloudflare's built-in **Workers Builds**. That way no Cloudflare API token has to be stored in GitHub.

- Dashboard → `locade-server` → **Settings** → **Build** → **Connect** → same repo, branch `main`.
- Build command: leave empty. Deploy command: `npx wrangler deploy`.
- Optional, to skip needless builds: set **build watch paths**.
  - Worker: `src/server/*`, `src/shared/*`, `wrangler.jsonc`, `package.json`, `package-lock.json`
  - Pages: `src/web/*`, `src/theme/*`, `src/shared/*`, `package.json`, `package-lock.json`

---

## Free-tier protection: how to tell it's working

- The cron writes the KV key `usage-status`. To see it: dashboard → **Storage & Databases** → **KV** → `USAGE` → `usage-status`.
  It holds `state` (`open` or `full`), `resetAt`, and each metric's `used`, `limit` and `ratio`.
- Once any metric reaches 85% of its daily free limit, creating a room returns "SERVERS FULL! BACK AT …", shown in the player's local time. Games already running keep going. Limits reset at 00:00 UTC.
- The limits are in `src/server/config.ts` (`FREE_TIER.dailyLimits`). Check them against the Cloudflare dashboard now and then.
