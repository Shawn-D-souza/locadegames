# Ludo

Format: **party** (everyone in the room on one board, taking turns; not 1v1, so no tournament). Catalog id `ludo`, 2–8 players.

Classic Ludo, four pawns each, round the board and home. The board grows with the room, so up to 8 can play on one board: the classic cross for 2–4, a 6-arm star for 5–6, an 8-arm star for 7–8. The game goes on until everyone but one has all four pawns home, so every player gets a place.

> This doc is Ludo's source of truth: rules, owner decisions, how it works, its look and its files. Platform-wide rules and the room flow are in [`CLAUDE.md`](../../CLAUDE.md); the shared visual language is in [`DESIGN.md`](../../DESIGN.md). Update this doc in the same change whenever something about Ludo changes.

---

## Rules (owner decisions, 2026-11-14, unless marked)

- **Everyone plays on one board**, up to the room's 8 players. Only players in the room when the host starts take part; anyone joining later watches.
- **The board grows with the room** (owner decision: if an 8-arm star fits a phone, why not): every player gets their own arm, base and home column, and the rules are the same on every board. **The bigger boards show only when that many play**: 2–4 players get the classic cross (with 2, they face each other; with 3, one arm stays free), 5–6 a 6-arm star, 7–8 an 8-arm star (a free arm when the room is odd). Their arms are shorter (my call), so a pawn's trip round is about the classic length (56–57 squares) and the squares stay about the same size.
- **4 pawns each, whatever the room** (owner decision: fewer pawns isn't Ludo).
- **Classic captures** (owner decision: the fight is the point of Ludo, so no fewer captures or more safe squares, even though big rooms play long; see Numbers): landing on another player's pawn sends it back to its base. **Safe squares**, where nobody is captured: every arm's start square, and a star on every arm (the classic board's star squares, 8 after each start).
- **No blocks** (owner decision): any number of pawns share a square, your own or anyone's; nothing stops a pawn passing.
- **Only a 6 brings a pawn out** of its base onto its start square (owner decision).
- **Rolling again** (owner decision, like Ludo King): a 6, a capture, or getting a pawn home each give another roll. **Three 6s in a row** end the turn, the third not played (my call: the moves made with the first two stand, as in most Ludo apps).
- **Getting home needs the exact roll.** A pawn goes round the whole track to its own arm's tip, then up its home column into the middle. A roll too big for a pawn means that pawn can't move.
- **A turn: roll, then move.** If no pawn can move, the turn passes (unless it was a 6). If only one pawn can move, it moves by itself. Otherwise **you pick, every time** (owner decision: even a 6 with every pawn in the base, or pawns standing together, is yours to choose; the game never chooses for you): you tap the pawn to move, and the ones you can move hop. **Where a pawn would land is never shown** (owner decision: counting is part of the game).
- **The game goes on until everyone but one has all four pawns home** (owner decision, like Snakes & Ladders). Places follow the order players finished; the last one still racing takes the next place. With 2 players the first home wins.
- **Winner:** whoever got all four pawns home first; they get the room trophy. Players who are home keep watching until the end.
- **Timer: 30 s** to roll and 30 s to pick (owner decision: classic, like Snakes & Ladders). The countdown shows only in the last 5 s. If the roll runs out, the server rolls for you **and** moves at once (you're away, so nobody waits twice). If the pick runs out, the server moves the pawn rolled for. Either way it moves by a fixed rule (my call): a pawn that gets home, else one that captures, else one out of the base, else the one furthest along.
- **Quitting** (the ✕ or the phone's back button after a confirm, or leaving the room) puts you out: your pawns leave the board, your turn passes on, your arm turns grey, and you rank **below everyone who finished or was still racing; a later quit ranks above an earlier one**. If a quit leaves just one player racing, the game ends there. A dropped connection or a hidden browser keeps you in, and the timer plays for you.
- **Turn order (the platform's Fair starts rule):** whoever has gone first least in this room's party games goes earlier; ties in an order picked from the server's random number. Seats go round the arms clockwise in turn order (spread evenly when arms are free), so every arm is the same.

## Numbers (`src/shared/games/ludo/config.ts`, board in `board.ts`)

`turnTimeMs` 30 000, `pawns` 4, `sixesLimit` 3, `enterDie` 6. Boards (`LUDO_BOARDS`): 4 arms of 6 (52 squares round; 56 to home), 6 arms of 4 (54; 56), 8 arms of 3 (56; 57).

**How long a game is** (simulated with the timeout's fixed rule playing every seat, counting 1.5 s per tap on top of the animations; owner decision: classic, long games accepted): median about **10 min for 2 players, 20 for 3, 32 for 4, 45 for 5, an hour for 6, 1.5 h for 7 and about 1 h 50 for 8** (9 in 10 within 13, 24, 39, 53, 76, 105 and 135 min). Captures are what makes big rooms long: about 140 in an 8-player game.

**How a move plays out** (shared, as the server times the next turn by it; `actionMs`): the shared die (`DICE_CONFIG`: tumbles 1 050 ms, shows its face 320 ms) when rolled, then a pawn out of its base flies to its start square `enterMs` 650, or hops `hopMs` 260 a square; captured pawns fly back to their bases `captureMs` 900; three 6s hold a moment `threeSixesMs` 700.

## How it works

- **Format `party`**, like Snakes & Ladders: the room keeps a `Party` with the game's whole state (`LudoState`), one JSON message per action, no server timers (whoever's turn it is claims a timeout once it runs out, everyone does if they're away), and the room sleeps between actions. The game plugs into the party format through `PartyGame` (`game.ts`; registered in `PARTY_GAMES`).
- **Two kinds of move:** `"roll"` (the server rolls the die from a fresh random number, the `seed` every move and timeout gets) and `{ pawn }` (which pawn moves the die just rolled). Each is one action and counts in `moves`, so a timeout names it and each gets its own clock, starting once the last action has played out.
- **Loaded dice, development only:** as in Snakes & Ladders (`src/web/games/dice/loadedDice.ts`), a dev server lets a playtest choose the die (`{ die: 6 }`); production always sends `"roll"`.
- **The board for the rules** (`board.ts`): arms are numbered clockwise; each arm's stretch of the track goes out along one column, round its tip, back in along the other, so the track is `arms × (2 × armLength + 1)` squares. A pawn's place is its **progress** along its own path (-1 in the base, 0 on its start square, up to `homeProgress` home), the same length for everyone; `trackSquare` turns it into a square round the track, to find captures.
- **State:** each seat's four pawns' progress, whose turn, the action count, 6s in a row, the die waiting for a pick (or none), who finished in what order, who quit in what order, and the last action (`LudoAction`: the die, whether it was rolled, what happened: moved, choose, no move, three 6s; the pawn's step with any captures; whether they roll again; whether it finished them).
- **Client:** every phone plays each action out from the moment it arrives (`useActionPlayback`), the moving pawn and any it captured placed by `movingPawns` from the same geometry the board is drawn with. Until it has played out, the turn stays with whoever moved and what it did (who finished, the ending) waits. A jump (reconnecting) just shows the board.
- **The board on screen** (`geometry.ts`): a star of arms 3 squares wide round a middle polygon with a side 3 squares long (a square, a hexagon, an octagon), split into the arms' home triangles. Between each two arms is a **yard** (the classic board's corner square) out to the board's edge, so the board is a square, a hexagon or an octagon with an arm's tip in the middle of each side; each yard holds a base. It's turned so **your arm points down, your base at the bottom left** (watchers see the first in turn order's), and fitted into the board's 100 units.

## Cost (free tier)

Like Snakes & Ladders per action: one WebSocket message and one SQLite row write per roll or pick, nothing between them. A game is roughly 160 actions with 2 players, 520 with 4 and 1 800 with 8 (see Numbers). Not measured yet.

## Look

Built from the shared language: ink on paper, players as colors, one coral action.

- **Layout:** as Snakes & Ladders: in portrait the players' row on top, the board under it (up to 520 px, fitting the screen's height), then the die beside your coral `ROLL!` or the banner; in landscape the board on the left and the rest beside it. The ✕ in the top-left corner while you're racing; once home, out or watching, the header with the back arrow and settings; late joiners get `WATCHING LIVE`.
- **Board** (owner direction: it must look polished, not like a diagram: no empty space between the arms, and **one clean edge**, never a frame inside a frame): the classic square fills an ink-outlined card with rounded corners, whose border is its edge; a hexagon or an octagon has no card, just its own ink outline. Each player's **yard** between the arms in their color, like the classic board's corners, with their **base** in its middle: a white disc with a small pale socket for each pawn. The octagon's yards are narrow, so its bases and the pawns waiting in them are smaller. The arms' squares white, with thin ink lines inside and a bolder one along each arm's sides. Each player's **start square and home column** in their color, and an **arrow** in their color on their arm's tip pointing into the home column; their **home triangle** in the middle in their color. A **star** on each safe square: gold (`ludoStar`) on white, white on a start square. A **free arm** (more arms than players) is drawn whole in grey, with its yard, base, home column and triangle (owner direction: an empty blank arm was confusing), like a quitter's, whose colors turn grey.
- **Pawns:** the logo's pawn (shared with Snakes & Ladders, `components/Pawn.tsx`) in the player's color, yours with a white dot. Pawns sharing a square huddle in it, smaller; in the smaller bases of the 6- and 8-arm boards they stand smaller. **Home pawns huddle in the middle of their triangle** (the biggest circle that fits in it), on a white pad so they show on their own color, a little smaller, so they always fit, on every board. **What a pawn stands on hides under it** (owner direction: like a counter on a real board): a star, or its socket in the base (a small socket, the size of the pawn's foot).
- **Your turn:** the screen washes in your color and the coral **ROLL!** pops in (**ROLL AGAIN!** after a 6, a capture or a pawn home). **Choosing:** the banner says **MOVE A PAWN!** with the last seconds; the pawns you can move hop, and a round target over each takes the tap: 1.5 squares wide on the track (so the 8-arm board's small squares are still easy to hit), as much smaller as the pawn is in a base or huddled, so pawns close together each keep their own. Someone else's turn: `ANA'S TURN`, `ANA ROLLS AGAIN`, `ANA IS MOVING`.
- **A move** (the same on every phone): the shared die tumbles to rest, then a pawn out of its base flies in an arc to its start square, or hops square by square, each landing with a squash; pawns it captured fly high back to their bases.
- **Notices** at the top once a move has played out: `YOU CAPTURED ANA!` / `ANA CAPTURED YOU!` / `ANA CAPTURED BEN!`, `YOU'RE 1ST!` / `ANA IS 2ND!`, `THREE 6s! TURN OVER` / `ANA: THREE 6s!`, `NO PAWN CAN MOVE` (only the roller), `CY QUIT`.
- **Ending** (each phone its own, then the results by themselves after 4 s or a tap): the board thumps and the banner turns into your result, as in Snakes & Ladders.
- **Results:** the platform's (champion card, a `RANKING` card; `QUIT` on a quitter's bar; no numbers).
- **Tile art:** the whole classic board, simplified to read at a glance at tile size (7 squares across, arms 2 long): four yards in four players' colors, each with its white base and a pawn waiting in it; the white cross with each arm's home column in its color; the four home triangles; a gold star; and one more pawn out on the track, all standing on white so they stand out.

## Sound

`src/web/games/ludo/sounds.ts`, a wooden board game on a desk like Snakes & Ladders (my calls). The die is the shared one (`src/web/games/dice/sounds.ts`: `dieRoll`, `dieSix`).

- **Each hop:** the pawn's wooden knock, a step up the scale each square, the hollow board soft under it (`ludoHop`).
- **Out of the base:** a round pop, then the knock landing (`ludoEnter`).
- **A capture** (the big moment): a hard knock with a thump, a falling swish as the captured pawn flies home, a small knock as it lands (`ludoCapture`; full volume on the phone whose pawn it was).
- **A pawn home:** two bright tines (`ludoPawnHome`). **The last pawn home:** a run up to the player's own note (`ludoFinished`, take = their color).
- **No move:** two dull knocks (`ludoNoMove`). **Three 6s:** a heavy blow, two notes falling (`ludoThreeSixes`).
- Someone else's move sits back a little (0.8), watching more (0.65). The last 5 seconds tick (`timerTick`). **Ending:** the platform's. Which sound plays when is pure (`actionCues.ts`), timed from the shared timings.

## Haptics

`src/web/games/ludo/haptics.ts`. Your own moves only, plus **your pawn being captured** (felt on someone else's move: `heavy` then `light`); never a hop.

- **Your die lands** / **a 6:** the shared die's (`dieLands`, `dieSix`). **Choose a pawn:** two `selection` ticks.
- **Out of the base:** `light`. **You capture:** `medium`, `heavy`. **A pawn home:** `light`, `medium`. **Your last pawn home:** `light`, `medium`, `heavy`. **Three 6s:** `heavy`, then `light`.
- **Your roll comes round:** `light` (not again after a bonus roll).
- **iPhones:** the tick on tapping ROLL! and on tapping a pawn (`hapticTarget` on its target). **Ending:** the platform's.

## Files

| Path | Purpose |
|---|---|
| `src/shared/games/ludo/config.ts` | Numbers above, the boards (`LUDO_BOARDS`), how long an action plays out (`actionMs`, `stepMs`) |
| `src/shared/games/ludo/types.ts` | `LudoState`, `LudoAction`, `LudoStep`, `LudoCapture`, `Progress` |
| `src/shared/games/ludo/board.ts` | The board for the rules: `boardFor` (by player count), each seat's arm, start squares, `trackSquare`, `homeProgress`, safe squares |
| `src/shared/games/ludo/rules.ts` | Pure rules: `createGame`, `applyMove` (a roll with its die, or a pick), `expire` (the timeout), `parseMove`, `destination`, `movablePawns`, `autoPawn` (the fixed rule), `quitSeat`, `finalPlaces` |
| `src/shared/games/ludo/game.ts` | Plugged into the party format (`PartyGame`): the die from the server's number |
| `src/web/games/ludo/LudoScreen.tsx` | The game screen: players' row, board, roll bar (the shared die's), notices, picking, ✕, ending |
| `src/web/games/ludo/LudoBoard.tsx`, `BoardArt.tsx` | The board: its drawing, the pawns on it, the tap targets while you choose; the drawing itself (yards, bases, squares, arrows, home triangles, outlines; drawn once) |
| `src/web/games/ludo/BoardMarks.tsx` | What hides under a pawn: the stars and the bases' sockets; the white pad under pawns home |
| `src/web/games/ludo/geometry.ts` | Board units: the outline, every square, the track, home columns and triangles (and the circle pawns home huddle in), yards, bases, for any number of arms and turned so yours points down (`ludoLayout`); where a pawn stands (`spotOf`); pawns sharing a square |
| `src/web/games/ludo/motion.ts`, `placePawns.ts` | Where the pawns an action moves are at any moment (`movingPawns`: flying out, hopping, captured pawns flying home); every pawn where it's drawn now, huddled per square |
| `src/web/games/ludo/useActionPlayback.ts` | Plays each action out frame by frame from when it arrives |
| `src/web/games/ludo/actionCues.ts`, `useLudoSounds.ts` | Which sound and feel plays when in an action (pure); playing them, your turn, the last seconds, the ending |
| `src/web/games/ludo/LudoArt.tsx` | Tile art |
| `src/web/games/ludo/sounds.ts` | Its sounds (in `GAME_SOUNDS` with the shared die's, and `SOUNDS`, `soundBook.ts`) |
| `src/web/games/ludo/haptics.ts` | Its feels (in `HAPTICS`, `hapticBook.ts`; none in `soundHaptics.ts`: they come from `actionCues`) |
| `src/web/preview/LudoPreview.tsx` | Dev only, `?preview=ludo`: every board size (2–8 players) with pawns on it; `&players=N` for one |
| `tests/ludo.test.ts` | Boards (sizes, trips, safe squares, arms), a 6 to come out, rolling again, picking, captures and safe squares, the exact roll home, finishing, three 6s, timeouts and the fixed rule, playing on and quits, parsing, the party (server die, clock after a move, timeouts, champion), timings, cue timings |
| `scripts/playtest/ludo.mjs` | Playtest (loaded dice): no move, a 6 out and rolling again, picking, a capture felt by both, three 6s, quits ending it, the ending, results, back to the room |
| `scripts/screenshots/ludo.mjs` | Screenshots: choosing a pawn, another's turn, the winner's ending, results, the 6-arm and the 8-arm boards |

## Ideas for later

- **Quicker turns for away players** in big rooms, if 8-player games feel too long once played (owner decision: classic rules, played until all but one are home).
- **Measure a full 8-player game's cost** once people play it.
