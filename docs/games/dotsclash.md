# Dots Clash

Format: **party** (everyone in the room on one board, taking turns; not 1v1, so no tournament). Catalog id `dotsclash`, 2–8 players.

Add dots to your own cells; a cell reaching 4 explodes into its four neighbours and takes them, dots and all, which can set off a chain. The board wraps on every side, so no dot is ever lost off an edge. The last player with dots left wins.

> This doc is Dots Clash's source of truth: rules, owner decisions, how it works, its look and its files. Platform-wide rules and the room flow are in [`CLAUDE.md`](../../CLAUDE.md); the shared visual language is in [`DESIGN.md`](../../DESIGN.md). Update this doc in the same change whenever something about Dots Clash changes.

---

## Rules (owner decisions, 2026-11-12, unless marked)

- **Everyone plays on one board** (not 1v1, not a tournament), up to the room's 8 players. Only players in the room when the host starts take part; anyone joining later watches.
- **The board wraps** top to bottom and left to right, so every cell has exactly 4 neighbours and **4 dots always explode**.
- **Start: secret picks, all at once** (owner decision 2026-11-12, replacing open picks in turn order). Everyone taps a cell at the same time; nobody sees anyone else's pick (not even on the wire: the room view hides where, and shows only who has picked). Once everyone has picked, every start appears together with **1 dot**; nothing explodes. **Two or more on the same cell** pick again (only they, still in secret; the others' picks stay hidden and kept). Picking next to someone is allowed, by chance only.
  - *Why not open picks:* with 3 or more players, the players picking after you could see your start and sit on its diagonals. Your first 3 taps are forced (you have one cell), so you burst first, spread into four 1-dot cells next to their 3-dot cells, and both of them burst before your next turn: **you were out for certain** (found by the owner, checked with the rules). Secret picks take away what that needs: knowing where you are.
- **Then turns, one player at a time**, in turn order. On your turn you tap **one of your own cells** (never an empty or someone else's) and it gets one more dot. No automatic taps, even with only one cell (owner decision: they would confuse people).
- **Explosions:** a cell with 4 dots empties and sends one dot to each of its 4 neighbours; each neighbour becomes yours, **with whatever dots it had** (another player's included), plus the new one. Every full cell in a wave bursts **at the same moment**, worked out from the same board, then the next wave, until none is full (a cell holding more than 4 keeps the rest).
- **Out:** a player left with no cells is out. Players knocked out by the same chain share a place.
- **Winning:** the last player with cells wins and gets the room trophy. The game always ends: every turn adds a dot and explosions never lose one, so once the board holds more than 3 per cell no chain can stop until one player owns everything. A chain also stops as soon as only the player tapping is left (my call, needed: a full wrapping board could otherwise burst forever), with a safety limit of waves.
- **Turn order (my call, the platform's Fair starts rule):** whoever has gone first least in this room's Dots Clash games goes earlier; ties in an order picked from the server's random number. The first game's order is random.
- **Timer: 30 s** to pick and **30 s** per turn (owner decision). The countdown shows only in the last 5 s. When it runs out: **picking, everyone who hasn't picked gets a cell picked from the server's fresh random number** (never one already picked, so no clash; random so no phone can work it out ahead and aim at it); **playing, your cell with the most dots** (first in reading order on a tie, no luck).
- **Quitting** (the ✕ or the phone's back button after a confirm, or leaving the room) puts you out and **your cells stay on the board in grey**: nobody plays them, and any explosion can take them (owner decision: nothing on the board suddenly changes, and the grey dots stay something to fight over). A quitter is skipped in the turn order. Only a real quit does this: a dropped connection or a hidden browser keeps you in, and the timer plays your turns.
- **Ranking:** the winner first, then everyone by how long they lasted (later out ranks higher); a quit counts as going out at that moment.
- **Players who are out** keep watching the board until the end (my call).
- **Chains play out in full, every wave the same length** (owner decision 2026-11-12: watching the chain is the fun, so it's never sped up or skipped). So nobody's time goes on watching, **the next turn's clock starts once the chain has played out** (the server knows its length: the dot landing plus each wave).

## Numbers (`src/shared/games/dotsclash/config.ts`)

`turnTimeMs` 30 000, `burstAt` 4, `startDots` 1, `maxWaves` 400, `landMs` 200, `waveMs` 380, `flyMs` 240. **Board size by players** (owner decision): 2 → 6×6, 3–4 → 7×7, 5–6 → 8×8, 7–8 → 9×9 (81 cells: about 32px a cell on a 320px phone). Cell `row × size + col`; that number is the move on the wire.

Chain timing (shared, as the server times the next turn by it): the dot lands for `landMs` 200 ms, then every wave takes `waveMs` 380 ms (`chainMs(waves)`): its dots fly for `flyMs` 240 ms, then the board rests 140 ms with them landed.

## How it works

- **Format `party`** (catalog: `format: "party"`, `turnTimeMs`). The room keeps a `Party` (`src/shared/party/`): the entrants in turn order, the game state, when the turn began, and once over the results and winner. Like a tournament's turn-based match it is all in the room record, one JSON message per move, and the server has no timers: whoever's turn it is claims a timeout once it runs out (everyone does if that player is away; while picking, everyone does), named by the turn's number (`moves`), and the server checks its own clock.
- **Fair order:** each player record counts `firsts` (games of this kind they went first in); `turnOrder` sorts by it, ties by a hash of the room's random `coinSeed`.
- **State** (`DotsClashState`): owners and dots per cell, phase (`pick` / `play`), whose turn (-1 while picking), the move count (a turn, or the picks settling: revealed or a clash; a single pick doesn't count), per seat the secret pick and whether it clashed, when they went out (`outAt`: an exit number, so one chain's knockouts share it and each quit gets its own), who quit, the last tap, the winner.
- **Rules** are pure (`rules.ts`): `applyMove`, `resolveTap` (the waves), `autoMove`, `autoPicks`, `quitSeat` (a quit while picking stops everyone waiting for them), `finalPlaces`, `hidePicks`. A quitter keeps owning their cells (drawn grey).
- **Secret picks:** the room record keeps every pick; the view sent to phones (`partyView`) replaces each with `HIDDEN_PICK`. Your phone shows your own pick from what you tapped, until the reveal (a reconnect mid-pick shows only that you've picked).
- **Client:** every phone replays the last tap's whole chain wave by wave from the same rules (`chainFrames`, `useChainPlayback`), so all see the same thing; the revealed starts land together like a tap's dot. A jump (reconnecting) just shows the board. Taps wait until the chain has settled on your screen. The last tap records its chain's wave count (`lastMove.waves`), and the next turn's `turnStartedAt` is `now + chainMs(waves)` (`chainMs(0)` after the reveal).

## Cost (free tier)

Like tic-tac-toe per move: one WebSocket message and one SQLite row write per pick or turn, nothing between turns (the room sleeps). A game is about as many turns as there are dots on the board at the end, at most about 3 × cells (~240 on 9×9); the room view is about 1 KB larger than a tic-tac-toe one. Not measured yet.

## Look

Owner direction 2026-11-12, from reference pictures (as a direction, not to copy): separate rounded tiles, not tic-tac-toe's continuous grid; dots on the tiles with 3 as a triangle; whose turn **above** the board and your turn unmistakable, shown by **animation, not lips or shadows**; everyone's color visible; no player list (8 players don't fit); no last-move outline; room between the board and the screen's edges. Tiles you may tap stay flat (no raised look). **Nothing pops up over the board** (owner decision: it gets in the way of the game).

- **Layout:** the players' row and the whose-turn banner on top, the board under it (up to 520px, fitting the screen's height), on phones, tablets and laptops alike (centered, like the other games). They sit **beside the board** (the board as tall as the screen allows) on a phone held sideways (`sideways:`, landscape up to 540px tall), and, for **8×8 and 9×9 boards (5+ players), in any landscape** (owner direction: on a laptop the big boards' cells were too small; like Ultimate Tic-tac-toe's cards beside its board): a 240px column (`partySide`), the players' row in lines of 4, a little extra padding on both sides. The ✕ sits in the top-left corner while you're still in; once out (or watching) a header with the back arrow (leave the room) and settings, and late joiners get a `WATCHING LIVE` badge. **No player list** (owner decision).
- **Players' row:** every player as a small tile in their color, in turn order, `YOU` under yours; whose turn it is stands bigger and keeps hopping (while picking: everyone who hasn't picked yet); players who are out shrink and fade (a quitter's in grey), once the chain that took them out has played. It shows who is who on the board without a list.
- **Your turn vs someone else's** (owner: they must never look alike): on your turn your tile hops in the row and the banner pops in filled with your color (`YOUR TURN!`, flat, no lip). On anyone else's turn the banner is white with `ANA'S TURN` in smaller type (no color tile in it, owner direction: the screen around it is already in their color).
- **Picking:** until you pick, the banner is in your color, `PICK YOUR START!` (after a clash `SAME CELL! PICK AGAIN!`; no explaining lines, owner direction: players learn by playing); your pick shows on your own board only; then a white `WAITING FOR ANA` / `WAITING FOR 3 PLAYERS`. The countdown shows for everyone. All the starts pop in at once.
- **Background:** everyone's screen takes the light wash of **whose turn it is** (owner decision, like the other turn-based games; it eases between turns), and the winner's at the end; while everyone picks it is plain lavender (`boardPage`).
- **Board:** rounded tiles (corners at 22% of a tile, so every size has the same shape) with a gap between them (8px, 4px from 8×8 up), no card. Empty tiles are white with a faint lavender edge (`tileEdge`; owner direction: white on the plain page was hard to see, so just a little); a taken tile fills with its owner's **full color** and shows its **dots like dice: white, or ink on a light color** (the color's own text color), kept clear of the corners: 1 in the middle, 2 side by side, **3 as a triangle** (owner direction), 4 as a plus for the moment before it bursts. A quitter's tiles are grey (the offline grey). **The tiles you may tap** (only on your turn or your pick; owner direction: very subtle, only the tile's own edge, never a shadow or an extra ring): your own tiles' edge darker than your color (`player-edge`, a little past `player-dark`), an empty tile's edge in a soft version of your color while you pick (`player-edge-light`, a little stronger than `player-light`). A tile you may tap squashes a little as you press it (an empty one lights in your light color). No last-move marker (owner decision).
- **A chain** (owner direction: smooth and satisfying to watch, nothing glitchy): the tapped tile's dots settle with a little squash (`animate-dot-land`: from 1.3×, no fade, so nothing flickers). A tile holding 4 shows them as a **plus** (top, right, bottom, left; owner direction: the square's dots flew out at a slant and the burst looked like it twisted). Each wave, the bursting tiles' 4 dots fly dead straight from their side of the plus to the middle of the four neighbours (`animate-dot-fly`, `ease-flight`), growing a little at the top of their arc, outlined in their color so they show over white, above every tile, with a ring flashing out; dots going off one edge visibly come in on the other. Then the board **rests** a moment with them landed: tiles change color and settle their dots, and a tile filled to 4 is seen full before it bursts next wave. Any dots past 4 stay in the bursting tile.
- **Nothing gives the ending away early** (owner direction): who the chain knocked out (the faded tile in the row, `IS OUT!`, your `You're out`), the winner's color on the screen and the result in the banner all wait until the last chain has played out; until then the turn stays with whoever tapped.
- **Banner details:** the last 5 seconds in a white bubble on the right; a quiet second line only when you're out ("You're out · watching"); long names take two lines. Nothing says a player is away (owner direction: the timer quietly plays for them).
- **Someone goes out:** a short notice at the top once their chain has settled (`BEN IS OUT!`, `ANA & BEN ARE OUT!`, `CY QUIT`): with no list on screen, this is how everyone learns it.
- **Ending** (each phone its own, then the results by themselves after 4 s or a tap): the board thumps and the banner turns into your result: your win in your color, tilted with a trophy, `YOU WIN!`, with turning **sun rays** behind the board and the screen in your color; the others a white `YOU'RE 2ND` (their place); late watchers an ink `ANA WINS!`.
- **Results:** the platform's (champion card, a `RANKING` card: place and name, `QUIT` on a quitter's bar). **No numbers** (owner decision: everyone but the winner ends with no cells, so a count says nothing; the place is the result).
- **Tile art:** a 3×3 corner of a board: red's 3 about to burst into blue's tiles, green below.

## Sound

`src/web/games/dotsclash/sounds.ts`, toy-box dots and bubbles (owner direction: satisfying, nothing irritating; the tap and the platform's sounds stay as they were):

- **Your start picked:** a soft round pop on your own note (`dotsClashStartPicked`). **The starts revealed:** every player's pop on their own note, a quick run up in turn order (70 ms apart).
- **A dot added:** a small bop, higher the fuller the cell (`dotsClashDotAdded`). Someone else's sits back a little; watching, more.
- **A chain:** each wave a juicy bubble pop (the kit's `bubble`: a round body springing up into its note, a soft weight under it, a tiny snap; no wooden rattle) with a light thud and a little ring an octave up, a step higher than the last (`dotsClashBurst`, from F#4), so a long chain runs up the scale.
- **Someone knocked out,** once the chain settles: a heavy plop and a big low bubble, then that player's own note falling softly away (`dotsClashPlayerOut`, take = their color). **You knocked out:** the same, deeper and longer, your note falling three steps (`dotsClashYouAreOut`, a `moment`).
- **Losing some of your cells makes no sound** (owner decision: it was irritating; the board shows it).
- **Your turn** has no sound (the last tap's sound is the cue). The last 5 seconds tick (`timerTick`).
- **Ending:** the platform's (the board's thump, then your result: the win fanfare, the loss sting, or the watchers' chord).

## Haptics

`src/web/games/dotsclash/haptics.ts`:

- **Your tap:** `medium`, the moment your finger lands (`DotsCell`). iPhones get their tap tick here too.
- **The starts revealed:** `light` (players only).
- **Your turn comes round:** `light`, once the chain before it has settled.
- **Your own chain:** every wave, `light`, then `medium` from the 4th wave on, as it runs on.
- **Your chain knocks someone out:** `heavy`, then `medium` (someone else's knockout isn't felt).
- **You're out:** `heavy`, then a late `light`. Losing some cells isn't felt (no sound, no feel).
- **Ending:** the platform's (the thump, then the win climb or the loss). Others' picks, dots and knockouts aren't felt.

## Files

| Path | Purpose |
|---|---|
| `src/shared/games/dotsclash/config.ts` | Numbers above, `boardSizeFor(players)` |
| `src/shared/games/dotsclash/types.ts` | `DotsClashState`, `DotsSeat`, `DotsPhase` |
| `src/shared/games/dotsclash/board.ts` | The wrapping board: `neighbours` |
| `src/shared/games/dotsclash/rules.ts` | Pure rules: `createGame`, `applyMove`, `resolveTap` (the waves), `chainFrames` (for phones to replay), `canTap`, `autoMove`, `autoPicks` (timed-out picks), `hidePicks` / `HIDDEN_PICK` (what phones see), `quitSeat`, `finalPlaces`, `cellsOf` |
| `src/shared/party/types.ts`, `party.ts` | The party format (room level): `Party`, `PartyResult`; fair `turnOrder`, `startParty`, `playPartyMove`, `claimPartyTimeout`, `quitParty`, `partyDeadline`, `turnPlayer`, `stillInParty` |
| `src/web/games/dotsclash/DotsClashScreen.tsx` | The game screen: players' row, turn banner, board, notices of players going out, ✕, ending |
| `src/web/games/dotsclash/DotsBoard.tsx`, `DotsCell.tsx`, `DotPips.tsx`, `flights.ts` | The board (rounded tiles with gaps; which dots come in over the far edge), one tile (faint edge, changed a little on the tiles you may tap, squashes as you press it, burst flight and ring), its dots (1, 2 side by side, a triangle of 3, a plus of 4; outlined while flying), where each flying dot starts and ends |
| `src/web/games/dotsclash/TurnStrip.tsx` | The players' row above the board: everyone's color in turn order, whose turn hops (while picking, everyone who hasn't picked), `YOU`, out players faded; in lines of 4 beside a big board |
| `src/web/games/dotsclash/TurnBanner.tsx` | Above (or beside) the board: your pick or turn (your color), theirs (white), waiting for the others' picks, the last seconds, then your result |
| `src/web/games/dotsclash/useChainPlayback.ts` | Replays each tap's whole chain wave by wave |
| `src/web/games/dotsclash/useDotsClashSounds.ts` | Which sound and feel plays when, timed to the board on screen |
| `src/web/games/dotsclash/DotsClashArt.tsx` | Tile art |
| `src/web/games/dotsclash/sounds.ts` | Its sounds (in `GAME_SOUNDS` and `SOUNDS`, `soundBook.ts`) |
| `src/web/games/dotsclash/haptics.ts` | Its feels (in `HAPTICS`, `hapticBook.ts`; rows in `soundHaptics.ts`) |
| `src/web/components/PartyRankingTable.tsx`, `src/web/utils/partyText.ts` | The results' ranking for a party game; names, `ANA'S` |
| `tests/dotsclash.test.ts` | Board sizes, wrapping, secret picks (hidden, revealed together, clashes pick again, auto picks, a quit while picking), bursts across edges, waves, knockouts and shared places, chains that can't settle, auto moves, quitters, fair turn order, timeouts, results |
| `scripts/playtest/dotsclash.mjs` | Playtest: secret picks out of turn order (checked hidden on another phone), the reveal, a chain knocking a player out, a quit, each phone's ending, results, back to the room |
| `scripts/screenshots/dotsclash.mjs` | Screenshots: picking starts, your turn, another's turn, knocked out, quit popup, the winner's ending, another's place, results |

## Ideas for later

- **Grey dots on the board from the start** in an even pattern that belong to nobody, for explosions to capture: more to fight over before players meet.
- **A 1v1 tournament version** on the platform's Swiss tournament.
- Measure a full 8-player game's cost once people play it.
