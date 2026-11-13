# Design Language

> **Note:** This document is a guideline, not a final authority. The project owner is the final decision-maker on all design matters. If any part of this spec conflicts with the owner's direction or feedback, the owner's direction takes precedence and the implementation (and this document) must be updated accordingly.

A clean, friendly, arcade-notebook visual language for online multiplayer party games, where each player plays on their own device. One deep indigo ink draws every outline and word on a pale dotted page; one coral button says "do this"; player colors say *who*. Shapes are rounded and tappable, outlines are thin, and depth is a single solid lip.

---

## 1. Principles

1. **Players are colors.** Each player gets a reserved color identity (see Section 2) used consistently across lobbies, game boards, scoreboards and results, on every device. The system supports any number of players.
2. **Ink on paper.** Thin indigo outlines (2px, 3px for the field being edited), rounded rectangles, big hit targets. Calm, not cartoony.
3. **Flat with a single drop.** Flat fills; depth comes only from a solid offset "lip" or a darker outline, never from gradients or soft blur.
4. **Calm frame, one loud action.** Menus sit on a pale dotted background inside white outlined cards; each screen has one coral main action, everything else is ink or muted.
5. **One player, one screen.** Every screen is designed for a single person on their own device. The player always knows who they are, whose turn it is, and what everyone else is doing.

---

## 2. Color

### Player colors (reserved)
Players are assigned colors in join order. The first four are the core set; the rest extend it for larger groups.

| Player | Name | Hex |
|---|---|---|
| P1 | Red | `#D7263D` |
| P2 | Blue | `#00BFEF` |
| P3 | Green | `#78C840` |
| P4 | Yellow | `#FFC02E` |
| P5 | Purple | `#9B5CFF` |
| P6 | Orange | `#FF8A1F` |
| P7 | Pink | `#FF4FB3` |
| P8 | Teal | `#16C2A3` |
| P9 | Maroon | `#9E2A4A` |
| P10 | Lime | `#C6E030` |
| P11 | Brown | `#A8683A` |
| P12 | Gray | `#8A94A6` |

Each player color has a **dark** variant (~25% darker) for outlines/shadows and a **tint** (~40% opacity) for paths, trails and inactive zones.

A player's color is the same on every device in the session: if you are Blue, everyone sees you as Blue.

### Scaling beyond 12 players
- Colors repeat in the same order, and each repeat cycle adds a **pattern** to the player's token and badge: cycle 2 = stripes, cycle 3 = dots, cycle 4 = checks.
- Every player also has an **avatar** and **display name**; avatar + color + name together form the identity.
- Players next to each other in turn order should not receive similar hues; skip ahead in the list if needed.

### Accessibility
- Never rely on color alone: always pair it with a name, avatar or pattern.
- Check the active palette for color-blind distinguishability (Red/Green, Blue/Purple, Lime/Yellow are the risky pairs) and lean on patterns when those pairs are both in play.

### Secondary accents
| Name | Hex | Use |
|---|---|---|
| Mode Violet | `#C23BE0` | Team play, special modes |
| Mode Magenta | `#E0308F` | Party modes, highlights |
| Grass Green | `#4A8C1C` | Invite / share CTA |
| Gold | `#FF9A14` | Crowns in games (Territory's leader), shaded toward Gold Light |
| Gold Light | `#FFE04A` | Where light hits a gold crown |
| Silver | `#D3D8E4` | 2nd place's disc on results tables (1st is Gold) |
| Bronze | `#EBA46E` | 3rd place's disc on results tables |

Secondary accents are deliberately distinct from player colors; on in-game screens, prefer neutrals for UI so player colors stay unambiguous.

### Game worlds
A game seen from the side (Head Crash) is a world that fills the screen: sky behind, ground, water in front. Whatever throws or moves a car there (a bounce pad, a fan) is `coral`, the action color.

| Token | Hex | Use |
|---|---|---|
| `sky` | `#ECEAFB` | The open air: pale, so every player color stands out on it |
| `skyHillFar` / `skyHillNear` | `#DEDAF6` / `#CFCAF0` | Soft round hills far behind, flat, no outline (and white clouds) |
| `ground` | `#4E479F` | Everything solid: rock, islands, planks; ink outline |
| `groundPebble` | `#3E388A` | Small round pebbles in the ground |
| `water` | `#2F5FD8` | Water, drawn in front of everything (royal blue: never a player color) |
| `waterCrest` | `#9DB6F5` | The band along the water's wavy top |
| `sea` | `#93D2EE` | A board of water seen from above (Sea Battle): light, so every player's ships read on it; what a miss leaves (with a faint white ripple) |
| `seaTile` / `seaTileLight` / `seaLip` | `#E9F0F8` / `#FAFCFF` / `#C3D3E8` | Sea Battle's tiles floating on the water, lit from above (lighter at the top, a soft lip at the bottom) |
| `char` / `charDeck` / `charPart` | `#2A2657` / `#3E3976` / `#625D98` | What's burnt (Sea Battle): a hit's tile, a sunk ship's hull, deck and fittings; the cannonball (shaded like metal) |
| `iron` / `ironDark` | `#565867` / `#33353F` | A cannon's barrel (Sea Battle): a neutral grey, and the inside wall of its muzzle above the black bore |
| `smoke` | `#7D7A99` | Smoke off a hit or a wreck (Sea Battle): soft puffs fading out round their edge, never a flat disc |

### Status colors
| Name | Hex | Use |
|---|---|---|
| Online | `#78C840` | Connected / ready |
| Waiting | `#FFC02E` | Not ready / reconnecting |
| Offline | `#8A94A6` | Disconnected (player chip greys out); a quitter's pieces left on a board (Dots Clash), in a full color family like a player's |

### Brand theme: Indigo ink + Coral
Deep indigo is the app's ink: text, outlines, button lips, the logo and the background dots all use it, so the app reads clearly as indigo (not blue). Coral is the single action color.

| Token | Hex | Use |
|---|---|---|
| `ink` | `#312C85` | Text, outlines, button lips, logo, background dots, secondary (dark) buttons |
| `coral` | `#F25555` | The main action button on a screen (`CREATE ROOM`). Slightly darker than the mockup's `#FF6467` so white text stays readable |
| `inkMuted` | `#9895C2` | Disabled buttons (flat, no outline or lip) |
| `inkSoft` | `#ADABCE` | Placeholders (`000 000`), quiet icons |
| `line` | `#D6D5E7` | Dashed dividers, light rules |
| `sectionLabel` | `#45556C` | Section labels on card edges |
| `subtle` | `#90A1B9` | Secondary text (`OR`, `(YOU)`), the edit pencil |
| `background` | `#F1F5F9` | Screen background, under an ink dot grid |
| `white` | `#FFFFFF` | Cards, fields, panels |
| Off Gray | `#C7C9D9` / `#5F6075` | Toggle off track / knob |

Neither ink nor coral is a player color. Coral sits near Player 1 Red, so P1 is a deeper crimson (`#D7263D`) to keep them apart.

### Rules
- Never use a player color for a non-player meaning on a screen where players are present.
- Menu screens use the `background` color with a small ink dot grid (game screens use a flat player wash instead) (24px apart, 1.5px dots). Content always sits in white outlined cards on top of it.
- Never a patterned background and busy content at the same time.

---

### Logo
An X (P1 Red), an O (P2 Blue), a pawn (P3 Green) and a die (white, ink pips, slightly turned) in a 2×2 group: lots of small games, played with friends (owner's pick; a controller with signal arcs was dropped as too AirConsole-like). Thick ink outlines and one solid ink lip under the whole group, like the buttons. Source: `src/web/public/logo.svg`; icons and the link preview are generated from it (`npm run icons`). Icons put it on the pale `background` (no dot grid); the link preview puts it beside a white card with `LOCADE GAMES` on the dot grid.

## 3. Typography

- **Logo / headings:** Roboto Condensed ExtraBold, ALL CAPS, ink. No sticker outline.
- **Everything else:** Roboto Mono (Bold for names, buttons and labels; Medium for small secondary text). The monospace gives the arcade/terminal feel.
- **Buttons:** Roboto Mono Bold, ALL CAPS, wide tracking (0.08em).
- **Numerals:** oversized and treated as illustrations, often in player colors.

| Token | Size (mobile) | Font | Case |
|---|---|---|---|
| `display` | 44 | Condensed ExtraBold | UPPER |
| `title` | 28 | Condensed ExtraBold | UPPER |
| `button` | 20 | Mono Bold, tracking 0.08em | UPPER |
| `label` | 18 | Mono Bold | As typed |
| `code` | 26 | Mono Bold, tracking 0.12em | Digits |
| `caption` | 14 | Mono, tracking 0.06em | UPPER for labels like `OR`, `(YOU)` |
| `badge` | 12 | Mono Bold, tracking 0.06em | UPPER, inside small pills |

- Text on coral and ink buttons is white.
- Player names on the match cards and the champion card wrap onto a second line; in single-line rows (player bars, points) they truncate with an ellipsis. In the points table on small phones (under 380px) names drop to `caption` so they fit next to `YOU` (owner decision). They never shrink below `caption`.
- Screen titles in the header shrink with the screen on very narrow phones (320px), so `LOCADE GAMES` is never cut off.
- Small phones (narrower than 380px, `max-phone:`): the HOST badge shows only its crown, a live match's LIVE badge only its pulsing dot, badges and bars get tighter padding, so names have room.
- Sideways, the QR popup shrinks the code to fit and drops the room code box under it.

## 4. Shape & Depth

- **Radius:** buttons and fields 16px (rounded rectangles, not pills); cards 28px; panels 40px; chips stay fully rounded.
- **Outlines:** 2px solid ink around cards, buttons and fields; 3px on the field being edited; 1px (`hair`) only between the tiny cells of a game tile's art. Game pieces may use a dark player variant.
- **Lip shadow:** only on things you can tap (a lip means "press me"). A solid, non-blurred 6px offset straight down in ink under active buttons; pressing squashes the button onto it. No soft drop shadows. Disabled buttons have no lip.
- **Dividers:** 2px dashed `line` rules with a short `subtle` word in the middle (`OR`).
- **Sunburst fan:** a radial-sunburst disk in a player's color, used behind that player's avatar on turn banners and results.

## 5. Components

### Mode card
Ink rounded body → giant colored numeral or icon breaking out the top edge, flanked by "speed lines" → full-width colored pill label at the bottom (`QUICK MATCH`, `PRIVATE ROOM`, `TEAM PLAY`).

### Game tile
Square white tile, always the same size (votes never resize it), 3px ink outline and small lip → the game's art filling it, drawn in the app's own style (pale fills, ink outlines, player colors; tic-tac-toe is a small copy of the real board) → game name in display caps under the art (never on it); a long name takes two lines, breaking only between words (its art gets a little smaller), never cut off. Votes: up to 3 suggester avatars overlapping on the top-right corner (your own first), then `+n`. The game you suggested gets a coral outline. Too few players online: a white `NEEDS 2+` tab on the top edge and the tile greys out for the host. Tiles stay two across even on small phones.

Art is code (an SVG / React drawing) for simple board and card games; action games may use an image instead, as long as it follows the same style.

### Room hub
- Header: back (leave room), `LOCADE GAMES`, settings gear.
- `ROOM` card: the code in a big outlined box, then three outlined icon buttons: copy, share, QR. QR opens a popup with a large black-on-white code of the invite link.
- `PLAYERS (n)` card: player bars in join order.
- `GAMES` card: outlined game tiles. The host taps a tile to start it straight away (no extra START button); others tap to suggest, and their avatars show under the tile.

### Settings
Gear in the header opens a menu: the Sound effects switch, the Volume slider right below it (0 to 100 in steps of 5, starting at 100, with its number beside it; greyed out and locked with sound off; every step ticks at its new volume as you drag, so you hear how loud it is), and the Haptics switch (only on phones that can feel it).

### Button
Rounded rectangle (16px), solid fill, 2px ink outline, 6px ink lip, white ALL CAPS mono label, optional left icon. Main action = coral; secondary action = ink; invite/share = Grass Green. In an "are you sure?" popup the two buttons are stacked full width (owner decision, after trying a white QUIT button, a text link and side-by-side buttons): the way out in ink on top (`QUIT`, `LEAVE`), the safe choice in coral below (`KEEP PLAYING`, `STAY`). Disabled = flat `inkMuted`, no outline or lip.

### Card
White, 2px ink outline, 28px radius, 20px padding, no shadow. Groups a screen's controls on the dotted background.

### Section card
A card whose ALL CAPS label (`label` color) sits on its top-left edge like a folder tab, sitting on top of the outline (its bottom on the line, its page-color box hiding the line under it; nothing hangs into the card): `ROOM`, `PLAYERS (2)`, `GAMES`. Screens stack these on the dotted background.

### Tab card
A card with its headline as an ink pill tab centered on its top edge (`CHAMPION!`, `OOPS!!`, `SERVERS FULL!`). Text never sits straight on the dot grid (owner: hard to read); it goes in a card or a white box.

### Error, servers full, joining
All three have the header (back arrow home, `LOCADE GAMES`, settings gear). **Error:** a white tab card `OOPS!!` with a coral sad face and the message, coral `HOME` at the bottom. **Servers full:** a tab card `SERVERS FULL!` with the yellow `Zzz` and `BACK AT 5:30 AM` (the player's own time; nothing more, owner decision), coral `OK!` at the bottom. **Joining a room:** a white tab card `JOINING ROOM` with the room code and three ink dots hopping one after another (owner pick).

### Player bar
Full-width rounded bar in the player's color with a 2px ink outline. Name at the left (white or ink, whichever reads better on that color; checked by a test). Badges at the right are small outlined pills (`Badge`) with their own fill so they read on any color: `YOU` (ink fill, white text), `HOST` with a crown, `AWAY`, trophy count (white fill, ink text). Your own bar is marked only by the `YOU` badge: bars are not tappable, so they never get a lip. Away players fade to 40%.

### Name field
Your name shown as a finished field: name in ink, `(YOU)` in `subtle`, an edit pencil at the right. Tapping it turns it into a text input (3px outline); empty means your first-visit random name.

### Text field
White, 2px ink outline, 16px radius; focus thickens the outline to 3px. The room-code field is centered, big spaced digits with a `000 000` placeholder and no visible label.

### Icons
[Lucide](https://lucide.dev) at 2px stroke, mapped to app names in `Icon.tsx` (screens never import Lucide directly).

### Icon button
Square rounded tile, white, 2px ink outline, 3px ink lip, ink glyph (back, settings, copy, share, QR). Glyphs are round-capped. A wide version fills a row (room code actions).

### Header
No bar: sits on the dotted background. Back at left, title in condensed ink `title` style, settings gear at right.

### Settings controls
- **Slider:** rounded ink track, gray remainder, large white circular thumb with an ink outline.
- **Toggle:** pill track; on = ink track + white knob; off = light gray track + dark gray knob.

### Ribbons & badges
Diagonal corner ribbon, "NEW!" in Player Yellow, slightly tilted.

### HUD counters
Dark rounded bar with white bold number, icon (gem, coin) overlapping the right end.

### Match screen (turn-based, 1v1)
Calm on purpose (owner decision: no header, no turn banner, no timer bar while playing). The only control is a small ✕ icon button in the top-left corner during your own live match; it (and the phone's back button) asks "Quit this game?" first: you lose the match, sit out the rest and stay in the room. In portrait the column keeps room under it for the whole match, so on a small phone it never sits on your card (and nothing moves when it goes). No dot grid here: the whole screen is a flat, very light **wash** of the color of whoever's turn it is (60% toward white, owner decision: strong enough to tell turns apart at a glance, while ink text stays readable; tested), easing to the other player's wash each turn. One centered column:
1. **Seat cards:** the two players side by side in two equal cards, you always on the left (watchers see the higher seed on the left). Everything about the match lives in these cards, with no extra text around them (owner decision). Each card: the player's piece (X or O, in their color) on a white disc (or their avatar, in a game without those pieces: Sea Battle) and the name; a `YOU` (or `AWAY`) ink tab sits on the top edge. No status words (owner decision): the card of the player whose turn it is simply fills with their color, and the other stays white (when both act at once, like Sea Battle's placing, both are lit and each phone takes its own player's wash; a board that plays a move out before its result shows, like Sea Battle's cannonballs, keeps the shooter lit until it lands). A game whose board needs the screen's height (Sea Battle) shows the two as **slim chips** in one row beside the ✕ instead (avatar, name, the last seconds; lit the same way), so nothing scrolls. In the last 5 seconds a small ink pill with the seconds appears under the name (its row keeps its height so nothing jumps). Not tappable, so no lip.
2. **Board.** On your turn the empty cells also rise (they get a lip). A board of small boards (Ultimate Tic-tac-toe) gets a wider column, and in landscape sits beside the two cards (stacked) in a wider screen column, sized to the screen's height (up to 720px on a laptop).

Results start the moment the match ends, and **each phone gets its own ending** (owner decision). The ending happens **on the board itself and nothing on the screen moves** (owner decision: a word between the cards and the board pushed the board down; a full-screen splash hid the board, and everyone should see how it was won). The style is **"All in"** (owner decision, picked on the preview page):

1. The last mark pops in and the board gives a small **thump**, then everything **holds still** for a moment (`freeze`), so the win lands before the party.
2. The **win line slashes** through the row in the winner's color (ink outline).
3. The board **fills with the winner's color**, the winning cells turn white, the other cells fade back, and the **result tag** stamps onto the board's bottom edge (like the section labels sit on their cards).

| Who | Ending |
|---|---|
| Winner | sparks fly off the line as it draws; turning **sun rays** in their color appear behind the board and the cards; **fluttering confetti** bursts out of the board (canvas, turning over like paper); a **ring of gold stars** bursts where the tag lands; the winning marks **jump one after another** (squash and stretch) and stay bigger with a soft glow; their piece on the card does a **spinning jump**; a crown drops onto their card, which bounces and stays a little bigger; the tag is in their color, tilted, with a trophy, `YOU WIN!` and points that **tick up** `+0 → +1 → +2` |
| Loser | the board still fills with the winner's color (they see who won and how); a quiet white tag slides up: `YOU LOST`, a grey `+0`; their piece on the card **droops and tips over**; their card gives one small sad shake, then fades a little; no mocking, no particles |
| Draw (both) | the board stays white, thumps and gives one small shake; ink tag `DRAW!`, `+1`; both pieces **shrug**; neither card is lit and the wash gives way to the plain dot grid (nobody won) |
| Watchers | board in the winner's color; ink tag `ANA WINS!`; no particles |

Points show only in a tournament (more than one round). If a player quit, the tag adds a small second line (`Ana quit`). Vibration comes later, separately (owner decision); for what's heard, see Sound.

There is no CONTINUE button (owner decision: it felt like the game froze). The result stays for `resultShowMs` (4 s, celebration included), then moves on by itself: to the points table, or, after the last match of a tournament, to the champion screen (the last match is never cut off). A tap anywhere skips the wait. If a player quit, one short line under the cards says so. While a match is live, watchers get a `WATCHING LIVE` badge (ink, pulsing coral dot) centered above the cards, so it never looks like their own match, a header with only the back arrow and the settings gear, and `BACK TO SCORES` at the bottom too (owner pick).

### Game-specific looks
Each game's own visuals (its board or arena, pieces, HUD, tile art) are in its doc in `docs/games/` (e.g. the tic-tac-toe board, Territory's raised land, trails and heads, Head Crash's world and cars), built from the language in this file.

### Round intro
The break before every round after the first (owner decision: everyone enters together and the round starts at one exact moment). Same calm column as the match screen, on the plain dot grid, no header: `ROUND 2 OF 3` title, your two seat cards (you on the left, nobody lit, no timer row) with an ink `VS` pill between them, or, in a white box, "You sit this round out" with "+2 points" under it, a big centered countdown numeral to the shared start (each new second pops), then the `POINTS` section card. When the countdown ends, every match of the round opens at once.

### Tournament standings
Shown between your matches, built like the room hub. The header title is `ROUND 2 OF 3` (back = leave). Two section cards:
- **`POINTS`:** a bar per player in their color (like the player bars): place in a small white circle, name, `YOU` badge, points in bold display type. Players level on points share a place; players who left are greyed with a dash for a place.
- **`PLAYING NOW`** (`THIS ROUND` once none is live): a white card per match with both players (avatar + name), the winner ticked, a quitter marked `QUIT`, a draw marked `DRAW`. A live match has a `LIVE` badge with a pulsing coral dot and a lip, and opens on tap. Whoever sits out gets a dashed card ("Sits out · +2 points"). One short hint under them ("Tap a match to watch.").

### Scoreboard & results
The results screen, built like the room hub (owner decision: no podium, no LEAVE). Header `RESULTS`; then the **champion card** (owner's pick of three tried layouts), its headline an ink pill tab on the card's top edge. One champion: `CHAMPION!`, the card in their color, their initial on a white disc (no lip or shadow, owner decision 2026-11-08), a chunky **gold crown** (theme gold, ink outline, a ball on each of its three points; `GoldCrown`) dropping onto its top once the card has popped in, `YOU` on the disc's bottom edge when it's you, and beside it the name in condensed title type. **No numbers on the card** (owner decision 2026-11-08: the card is the moment, who won; the table below has the numbers; each thing is said once). A shared title: `SHARED TITLE!` (`DRAW! SHARED TITLE` after a drawn 2-player match), a white card with one bar per champion in their color, each with a gold crown, so nobody's color wins. Below it the final `POINTS` card (the same colored bars as the points screen); after an arena game (Territory) or a game everyone plays on one board (Dots Clash) a `RANKING` card instead. The champion is in the table too (owner decision 2026-11-08: the card is the moment, the table is the full order). Each bar: the place on a disc, **gold for 1st with a small gold crown (owner decision 2026-11-08: kept, though the card has one too), silver for 2nd, bronze for 3rd**, white after; the name; `YOU` on your own bar (owner decision 2026-11-08: no lips or shadows here); the points, or the land share (still in) or `OUT 0:42` / `QUIT 0:42` (the time big, the word small), (Dots Clash shows no number, owner decision: the place is the result; only `QUIT` on a quitter's bar), all in the games' number font (the display font at its heaviest, decimals smaller). The host gets two buttons at the bottom: coral `PLAY AGAIN!` (same game, everyone) and ink `BACK TO ROOM` (everyone back to the room); the host's back arrow does the same. Everyone else sees a quiet line under the table, "Waiting for the host to pick the next game" (no hopping dots: owner found them irritating), and their back arrow takes only them to the room (to suggest the next game); the host's pick then takes everyone along. The card pops in, then confetti in the champions' colors falls once (outlined ink pills, never blocking taps).

### Connection feedback
Small status dot on each player chip. Reconnecting shows a yellow pill toast at the top, between the corner buttons so it never covers them (the same for short notices like "Not your turn yet!"); connection lost shows a white modal with `RECONNECT` and `HOME`.

---

## 6. Illustration

- Flat vector, thick dark outlines, simple highlights (one white shine).
- Characters are round, cute, minimal-feature (dot eyes, small smiles).
- Objects are slightly exaggerated and oversized; scenes are cropped tight.
- Game worlds may change palette freely, but keep the outline weight and flat shading.

---

## 7. Layout & Spacing

- Base unit: 8px. Common gaps: 16 / 24 / 32.
- Orientation is not fixed: each game uses whichever orientation suits it, and menus must work in both portrait and landscape.
- Card grids reflow by width (two columns on narrow screens, more on wide); generous outer margin (24–32px).
- Primary targets ≥ 64px tall; primary actions sit within easy thumb reach for the current orientation.
- In-game structure keeps three zones: opponents (player chips), the shared game area, and your own controls. Arrange them to fit the orientation, with your controls nearest your thumbs.
- Scoreboards and player lists use a scrolling list or wrapping grid, never a fixed number of slots, so any player count fits.

---

## 8. Motion (intent)

- Bouncy, springy: overshoot on press-in and release.
- Buttons squash down onto their lip when pressed.
- Rewards and "NEW!" items wobble or pulse gently.
- Players joining the lobby pop in; leaving players shrink out.
- Other players' moves are animated briefly so remote actions feel present, not instant jumps.
- Waiting (joining a room) shows three dots hopping one after another, never a spinner.
- Quick (150–250ms); no slow fades. The exception is celebration moments (win line, champion card, confetti), which play once and never block input.

---

## 9. Voice in UI

Short, shouty, playful: `OOPS!!`, `YOUR TURN!`, `INVITE FRIENDS!`. Exclamation marks welcome; jargon is not.

---

## 10. Sound

Sound effects only (owner decision: no music), all generated by our own code. A sound must match, in order: the other sounds, the moment on screen, this language, the game (owner's order).

**The idea: a toy box on a desk, in one small room.** Felt mallets, round pops, wooden blocks, a rubber stamp, and a trumpet for results. Physical things you could touch, the opposite of bleeps and lasers: nothing here is a plain oscillator.

- **One gesture, not a tune.** A sound is one touch with one note or chord in it. Rising tunes on interface actions sound like cheap notifications.
- **Nothing hissy.** No paper or marker textures on the win line, endings or hits; only Territory's trail is a marker. Confetti is silent.
- **The interface is pops and notes,** with no wooden knocks on icon buttons or switches. A press is a short note with a soft seat under it as the button settles: warm on the coral button, plain and lower on ink buttons, a small pop on icon tiles, stepping down on the back arrow.
- **Nothing adds to what already sounded.** An ordinary popup opens silently on its button's press; your turn has no sound because the opponent's mark is the cue. A result's number starts counting only after its sound has finished.
- **One room.** Every sound shares the same short, soft-walled room, baked in. Quick sounds stay close; big moments open up into it.
- **One scale.** Every pitched sound uses D major pentatonic and nothing else (`ScaleNote` makes any other note a compile error), so sounds that overlap never clash. Good news ends high; bad news falls.
- **Players are notes too.** Each player's color has its own note, so a filling room climbs the scale; a player leaving plays their note softly back down.
- **Short where frequent, generous where rare.** Taps are over almost at once; a match win is a short celebration because it plays every win; only the champion rings for seconds.

**Levels** (loudness on a phone speaker; a sound says which it is and is set to it automatically, so a new one fits without tweaking; `SOUND_LEVELS`): `faint` (heard all the time or in passing: the Territory trail), `quiet` (friends' small actions, a Head Crash car's motor), `tap` (your finger on the interface), `event` (a move, a clock tick, a player arriving), `moment` (the game starts, a knockout), `celebration` (you won: nothing is louder). Winning is always the loudest thing in the app; somebody else's event is quieter than your own.

**Timing.** Sounds land on what's seen, on the animation's own times (from the motion tokens): a match's ending plays as a sequence (the last mark, the board's thump, the win line, then the result as the board fills with color). A press sounds when it's confirmed (the tap, not touch-down, so scrolling stays silent). A move's sound comes when the server has accepted it.

**Each ending has its own sound on each phone,** as it has its own look: three trumpets climbing for the winner, the same trumpet alone and far away for the loser, a shrug for a draw, one friendly chord for watchers.

**Deliberately silent:** screen changes, keystrokes (the phone's keyboard has its own), disabled buttons, the hopping joining dots.

**Behaves like a native app:** starts from the first touch, doesn't interrupt your music and obeys the iPhone's silent switch (ambient audio session), stops when the app is hidden, and is switched off or turned down in Settings. Volume 100 is every sound as made; below that everything drops together, so the levels above keep their order. Overlapping sounds get their peaks rounded off rather than clipped.

Each game's own sounds are built from the same kit, room, scale and levels, with their own character; see the game's doc. **Sea Battle is the exception** (owner decision 2026-11-13: its toy-box versions sounded fake): its cannon, water and blasts are made to sound real, from its own instruments, with no notes, at the same levels.

---

## 11. Haptics

**The idea: the same toy box, in your hand.** Haptics are the weight of what's on screen: a button settling, a block landing, a stamp. They follow the sounds, so they land on the same moments and stay in time with the animations.

- **Your hand, your news.** You feel what you did and what happened to you: not friends' small actions or others' events. While watching a match you feel what lands as it ends (the board's or arena's thump, and in Territory the winner's head dropping) and Territory's last seconds on the clock, never marks or a result.
- **Short where frequent, patterns where rare.** Everyday touches are one short pulse. Only moments that matter get a pattern, and nothing lasts more than about 0.65 s, so it never feels like a phone call.
- **Never constant.** Nothing buzzes while you steer or draw, so that the moments stand out and the battery lasts.
- **Winning is the biggest feel,** as it's the loudest sound. Good news climbs and lands hard; bad news hits, then fades.

**Levels** (`HAPTIC_LEVELS`): `selection` (a crisp tick: small controls, a clock's seconds), `light` (buttons, small good news), `medium` (the game starts, your mark, a bump), `heavy` (GO, something landing). Browsers can't set a motor's strength, so softer levels switch it on and off quickly. The names match the phone's own levels, which the Android app will use.

| Moment | Feel |
|---|---|
| Icon button, switch, game tile, match card, each step of the volume slider | `selection` |
| Big button | `light` |
| A friend arrives, the code is complete, you become host, the connection is back | `light` |
| The game starts | `medium` |
| 3, 2, 1 | `light` each |
| GO | `heavy` |
| A clock's last seconds | `selection` each |
| Something refused | two `light` |
| A serious question, the connection dropped | two `medium` |
| Error, servers full | two `medium`, then `heavy` |
| A match ends | `heavy` as the board or arena lands |
| You win a match | climbs `light`, `medium`, `heavy` |
| You lose a match | `heavy`, then a late `light` |
| A draw | `heavy` as the board lands (it takes the place of the shrug's first pulse), then `light` |
| You're the champion | the climb, then three `heavy` |
| Someone else is champion | `light` |

**Deliberately not felt:** keystrokes (the phone's keyboard has its own), text fields, disabled buttons, the Territory trail, points counting up, a friend's suggestion, a friend leaving, others' knockouts, the copied notice (its button already answered).

**What each phone can do:**

| Phone | What it feels |
|---|---|
| Android browsers | Everything above |
| iPhones | One fixed system tick on every tap of a button or board cell; no game events or patterns (Apple's limit since iOS 26.5) |
| Android app (later) | Everything above, on the phone's real levels |

Haptics are never the only feedback: a phone may have no motor, and some don't vibrate in silent mode. To judge them on a real phone: `npm run dev:web -- --host`, then open `?preview=haptics` on the `Network:` address.

Each game's own feels use the same levels; see the game's doc.
