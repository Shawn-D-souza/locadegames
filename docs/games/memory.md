# Memory

Format: **party** (everyone in the room on one table of cards, taking turns; not 1v1, so no tournament). Catalog id `memory`, 2–8 players.

The classic card game for the whole room: every card lies face down; on your turn you turn two, and a pair is yours and you turn two more. Ours deals new pictures from around the platform in new colors every game, so nobody remembers the last one, and the same picture in two colors is two different pairs.

> This doc is Memory's source of truth: rules, owner decisions, how it works, its look and its files. Platform-wide rules and the room flow are in [`CLAUDE.md`](../../CLAUDE.md); the shared visual language is in [`DESIGN.md`](../../DESIGN.md). Update this doc in the same change whenever something about Memory changes.

---

## Rules (owner decisions, 2026-11-16, unless marked)

- **Everyone plays on one table** (party format, not a 1v1 tournament), 2–8 players. Only players in the room when the host starts take part; anyone joining later watches.
- **A turn is two cards.** Turn one face up (everyone sees it), then a second. **A pair is yours and you turn two more**; two that don't match stay face up for everyone to see for a moment, turn back, and the turn passes on.
- **A pair is the same picture in the same color.** The same picture in another color is another pair (owner: it confuses, and that's good).
- **The pictures** come from the platform's games, in groups: simple shapes (circle, square, triangle, star, heart, moon), tic-tac-toe's X and O, chess pieces (king, queen, rook, bishop, knight, pawn), a Head Crash car, a Territory character, dice (1–6 pips), a pool cue, Sea Battle's ship and cannon, a snake and a ladder, the crown and a trophy. **Never balls of any kind or Ludo's pawn** (owner: they look like the circle and the chess pawn).
- **Picked fresh every game, at random:** about two thirds of the pairs are different pictures, **one or two from a group, never a whole group** (owner: two from a group confuse, and one alone is easy to remember); the rest are pictures already in, again in another color. **Colors are every player color at random** (owner), except grey (a quitter's color). My calls: groups are picked evenly (so a group of six isn't favoured); a picture in two colors gets them from different families (red, maroon, pink · yellow, orange, brown · green, lime · blue, teal · purple), so the two pairs are always told apart; pictures that look alike never share a game (the circle and the O, the square and a one-pip die, the crown and the queen).
- **The end:** once every pair is found. **Most pairs wins**; players level on the most **share the win** (the platform's rule), each with a trophy.
- **Turn order (the platform's Fair starts):** whoever has gone first least in this room's party games goes earlier; ties in an order picked from the server's random number.
- **Timer: 30 s per card** (owner decision). The countdown shows only in the last 5 s. When it runs out a card in play is turned for you, picked at random (no help from the server: it may be any card).
- **Quitting** (the ✕ or the phone's back button after a confirm, or leaving the room) takes you out: you're skipped, a card you had face up turns back, and **your pairs stay on the table in grey** (my call, like Dots & Boxes' boxes) but can't make you place above anyone who stayed. If only one player is left, the game ends and they win. A dropped connection or a hidden browser keeps you in, and the timer turns your cards.
- **Ranking:** everyone who stayed by pairs (level: the same place), then the quitters, the last to quit first. The results show **each player's pairs** (like Dots & Boxes' boxes).

## Numbers (`src/shared/games/memory/config.ts`)

`turnTimeMs` 30 000, `flipMs` 220, `pairMs` 450, `missShowMs` 1 500, `pictureShare` 2/3, `perGroup` 2. **Cards by players** (owner decision, 2026-11-16: the first sizes, 8 pairs for 2 players up to 18 for 8, made a game of a couple of minutes, far too short; 18–24 pairs, tried next, a little too long): 2 → 6 × 5 (15 pairs), 3–4 → 6 × 6 (18), 5–8 → 6 × 7 (21 pairs, 2–3 each with 8): about 3–4 minutes with 2 players, 5–6 with a full room (about 2 turns per pair at 6–8 s a turn). Six across everywhere: a card is about 50 px on a normal phone, about 36–42 px on the smallest (320 × 568), about 41 px for 6 × 7 on a phone held sideways (the board takes the screen's whole height there). There are 29 pictures in 10 groups; one or two from each with no lookalikes always gives at least 14, so up to 21 pairs a picture comes in at most two colors (a bigger board would bring a third).

Cards are numbered row by row (`row × cols + col`); the card number is the move on the wire.

The next card's clock starts once the card has turned (`flipMs`); after a pair, once it has bounced (`+ pairMs`); after a miss, once it has shown and turned back (`+ missShowMs + flipMs`). Phones block taps until then.

## How it works

- **Format `party`** (catalog: `format: "party"`, `turnTimeMs`). The room keeps a `Party` (`src/shared/party/`); one JSON message per card, nothing between turns (the room sleeps), and no server timers: whoever's turn it is claims a timeout (everyone does if they're away), named by the card count (`moves`), and the server checks its own clock.
- **The faces are dealt as cards are turned** (my call, so the layout is secret even from anyone who could read the server's numbers): at the start the server picks the game's pairs (`pickFaces`, from the game's random number) but no card has a face yet. The first time a card is turned it gets one of the faces not yet on a card, each card as likely (`dealFace`, from the server's fresh random number for that move), and keeps it. That plays exactly like a shuffled deck, but where anything is can't be known ahead by anyone.
- **Phones see only cards face up** (`view`): a found pair, or the card open this turn. A card turned before and turned back is face down again for everyone; what's left to deal stays with the server. A miss's two faces ride along in `lastMove` so phones can show it before it turns back.
- **State** (`MemoryState`): cols and rows, the game's faces (picture + color), what's left to deal, each card's face once turned, who found each card, the card open this turn, whose turn, the card count, who quit and in what order, the last move (who, its one or two cards and their faces, matched), over.
- **Rules** are pure (`rules.ts`): `applyMove` (with the server's random number), `expire` (a random card in play), `quitSeat`, `finalPlaces`, `winners`, `view`.
- **Client:** the board is plain DOM, a CSS grid, **the same way round on every screen** (owner decision, 2026-11-16: players point at cards across the room, so every phone shows the same arrangement; turning the grid in landscape to fit a sideways screen was tried and dropped). In landscape it fits the screen's height beside the players' row. **Your card starts turning the moment you tap** (the first half of the turn, squeezing thin) and opens out when the server says what it is; if the server refuses, it turns back. No second tap until the server has answered and the card has played out. **Smoothness:** the flips only animate `scale` and `opacity` (the compositor's work, not layout); the cards are memoized with plain props, so the screen's 10-a-second clock redraws none of them (measured on the production build with the CPU slowed 4×: no late frames through a flip and a miss turning back). The dev server's React is several times slower, so judge smoothness on the production build.
- **Loaded cards** (dev server only, like loaded dice): a playtest can say what a card turned for the first time turns out to be (`window.loadedCards = ["new", "match"]`: a picture nobody has seen yet, or the open card's partner), so it reaches its moments without luck.

## Cost (free tier)

Like Dots & Boxes per move: one WebSocket message and one SQLite row write per card, nothing between turns. A game is at least two cards per pair (30–42 cards), more with every miss: about 80–130 messages in a typical game. The room view is about 1–3 KB larger than a tic-tac-toe one. Not measured yet.

## Look

Built from Dots & Boxes' party screen (my calls, for the owner to change):

- **Layout:** the players' row and the whose-turn banner on top, the board under it, fitting the screen's height. In any landscape they sit beside the board in a 240 px column (`partySide`), the players' row in lines of 4 with more than 4 players. The ✕ sits in the top-left corner while you're in; once you quit (or watching), a header with the back arrow and settings, and late joiners get a `WATCHING LIVE` badge.
- **Players' row:** everyone's tile in their color, in turn order, **with their pairs so far on it**, `YOU` under yours; whose turn it is hops; quitters fade, grey.
- **Banner:** your turn fills with your color (`YOUR TURN!`, after your first card `ONE MORE CARD!`, after a pair `PAIR! GO AGAIN!`, `2 PAIRS! GO AGAIN!`); someone else's is white, `ANA'S TURN`. Last 5 s in a bubble.
- **Background:** the light wash of whose turn it is, then the winner's (yours, if you share the win).
- **Cards:** face down, a deep indigo back (`memoryBack`, never a player's color) with a big paler question mark pressed into it (`CardBackMark`; owner's pick of six patterns: a diamond, a lattice, the logo, dots, the question mark, a star; its inner frame taken off, owner: just the question mark), outlined in ink, **flat, with no lip** (owner decision, 2026-11-16: a lip that came and went with your turn looked glitchy; the banner says when it's your turn). Face up, white with its picture in its color. **Turning over** is half a turn seen side on, on every phone: the side it shows squeezes thin (slow, then fast), the two sides swap at the edge, and the other side opens out (fast, then slow); your own card starts squeezing the moment you tap and opens out when the server answers. (Others' cards used to skip the first half and snap; fixed after the owner saw a glitch.) A **pair found** bounces once, then stays face up on its finder's light wash, ringed in their color, its picture faded (grey for a quitter's). A **miss** wobbles, shows for everyone, then turns back.
- **Pictures** (`pictureArt.ts`): our own flat drawings in the look of the games they come from, in the card's color and its light and dark shades, outlined in ink like the chess pieces (whose shapes they reuse). The die is in the card's color with white pips; the car is Head Crash's open-top roadster with the driver's head sticking out; the head is Territory's cube with its crest and eyes; the cue's butt is in the color, its shaft Pool's pale maple; the crown is the results' crown shape.
- **Someone quits:** a short notice at the top (`CY QUIT`).
- **Ending** (each phone its own, then the results by themselves after 4 s or a tap), once the last pair has played out: the board thumps and the banner turns into your result: `YOU WIN!` (or `SHARED WIN!`) in your color, tilted with a trophy, with sun rays behind the board; the others a white `YOU'RE 2ND`; late watchers an ink `ANA WINS!` (`ANA & BEN WIN!`).
- **Results:** the platform's (champion card, a `RANKING` card with place, name, `QUIT` and each player's pairs).
- **Tile art:** three by three cards, most face down; a pair of red stars face up and a blue knight waiting for its partner. Each card lies a little askew (turned a few degrees, nudged a little), like cards laid out by hand on a table, so the tile stands apart from the other tiles' tidy grids (owner direction); the cards a little smaller than their spots, so the tilts keep clear space round them (owner's pick of the layouts tried). Fixed, the same every time.

## Sound

`src/web/games/memory/sounds.ts`, cards on a table (my calls):

- **A card turned** (anyone's): a quick breath of air and a crisp card tap as it lands face up (`memoryFlip`, 4 takes in turn). Someone else's sits back a little; watching, more.
- **A pair found,** as it bounces: the same round note twice, close together (two cards that match), a step higher for every pair the same player finds in a row (`memoryPair`). **Your own** is fuller, with a bright ring an octave up (`memoryYourPair`).
- **A miss:** two soft felt notes falling (`memoryMiss`), then the two cards turning back as a soft double flick (`memoryTurnBack`, quiet).
- **Your turn** has no sound (the last card's sound is the cue). The last 5 seconds tick (`timerTick`).
- **Ending:** the platform's (the board's thump, then the win fanfare, the loss sting, or the watchers' chord).

## Haptics

`src/web/games/memory/haptics.ts`:

- **Your card:** `light`, the moment your finger lands (`MemoryCard`). iPhones get their tap tick here too.
- **A pair you find:** `medium`, with its sound (`memoryYourPair` in `soundHaptics.ts`).
- **Your turn comes round** (after a miss or a quit): `light`.
- **Ending:** the platform's. Others' cards and pairs aren't felt.

## Files

| Path | Purpose |
|---|---|
| `src/shared/games/memory/config.ts` | Numbers above, `gridFor(players)`, `flipPlayOutMs` |
| `src/shared/games/memory/pictures.ts` | The pictures by group (`PICTURE_GROUPS`, `PictureId`), pictures that look alike (`LOOKALIKES`), card colors by family (`COLOR_FAMILIES`, `CARD_COLORS`) |
| `src/shared/games/memory/deal.ts` | A game's faces (`pickFaces`) and a card's face the first time it's turned (`dealFace`) |
| `src/shared/games/memory/types.ts` | `MemoryState`, `MemoryFace`, `MemoryMove`, `MemorySeat` |
| `src/shared/games/memory/rules.ts` | Pure rules: `createGame`, `parseMove` (loaded deals on a dev server), `canTurn`, `applyMove` (a pair: turn again), `expire`, `quitSeat`, `finalPlaces`, `winners`, `pairsOf`, `view` (only cards face up) |
| `src/shared/games/memory/game.ts` | The `PartyGame` (`memoryGame`) for `PARTY_GAMES` |
| `src/web/games/memory/MemoryScreen.tsx` | The screen: players' row, banner, board, a miss showing, your card turning, quit notice, ending |
| `src/web/games/memory/MemoryBoard.tsx` | The grid of cards, the same way round on every screen |
| `src/web/games/memory/MemoryCard.tsx` | One card (memoized): its turns (whole, or the second half after your tap), a pair's bounce, a miss's wobble |
| `src/web/games/memory/CardSide.tsx` | One side of a card: the back, or the face (found: the finder's wash and ring) |
| `src/web/games/memory/CardBackMark.tsx` | The back's pattern: a big pale question mark (the cards and the tile art) |
| `src/web/games/memory/Picture.tsx`, `pictureArt.ts` | A card's picture (SVG) from its drawing as data |
| `src/web/games/memory/cardText.ts` | A face's name for screen readers and playtests (`faceName`: "red knight") |
| `src/web/games/memory/loadedCards.ts` | Playtests' loaded deals (development only) |
| `src/web/games/memory/MemoryArt.tsx` | Tile art |
| `src/web/games/memory/sounds.ts` | Its sounds (in `GAME_SOUNDS` and `SOUNDS`, `soundBook.ts`) |
| `src/web/games/memory/useMemorySounds.ts` | When they play, timed to the cards; your turn's feel |
| `src/web/games/memory/haptics.ts` | Its feels (in `HAPTICS`, `hapticBook.ts`; `memoryYourPair` in `soundHaptics.ts`) |
| `tests/memory.test.ts` | Grids, picking pairs (groups, lookalikes, colors, variety), dealing, turns, pairs, misses, refusals, loaded deals, the end and shared wins, quits, timeouts, what phones see, play-out times, the party format |
| `scripts/playtest/memory.mjs` | Playtest: a miss, a pair, a quit, clearing the board, each phone's ending, the results, back to the room |
| `scripts/screenshots/memory.mjs` | Screenshots: your second card, their turn, a miss, a pair, the quit popup, won, a place, results, 8 players on 6 × 7 |

## Ideas for later

- A short peek at the start (every card face up for a second or two) for a gentler game.
- More picture groups as games are added (Checkers' crowned piece, 4 in a Row's rack), keeping clear of anything round.
