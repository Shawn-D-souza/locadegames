# Design Language

> **Note:** This document is a guideline, not a final authority. The project owner is the final decision-maker on all design matters. If any part of this spec conflicts with the owner's direction or feedback, the owner's direction takes precedence and the implementation (and this document) must be updated accordingly.

A loud, friendly, toy-like visual language for online multiplayer party games, where each player plays on their own device. Everything feels chunky, rounded and tappable. Color identifies *who* (players), shape identifies *what* (actions), and nothing is ever sharp, thin or subtle.

---

## 1. Principles

1. **Players are colors.** Each player gets a reserved color identity (see Section 2) used consistently across lobbies, game boards, scoreboards and results, on every device. The system supports any number of players.
2. **Chunky over delicate.** Thick strokes, fat type, big hit targets, heavy rounded corners.
3. **Flat with a single drop.** Flat fills; depth comes only from a solid offset "lip" or a darker outline, never from gradients or soft blur.
4. **Calm frame, loud content.** Menus sit on pale lavender-indigo backgrounds so saturated cards and buttons pop.
5. **One player, one screen.** Every screen is designed for a single person on their own device. The player always knows who they are, whose turn it is, and what everyone else is doing.

---

## 2. Color

### Player colors (reserved)
Players are assigned colors in join order. The first four are the core set; the rest extend it for larger groups.

| Player | Name | Hex |
|---|---|---|
| P1 | Red | `#FF5A5A` |
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

Secondary accents are deliberately distinct from player colors; on in-game screens, prefer neutrals for UI so player colors stay unambiguous.

### Status colors
| Name | Hex | Use |
|---|---|---|
| Online | `#78C840` | Connected / ready |
| Waiting | `#FFC02E` | Not ready / reconnecting |
| Offline | `#8A94A6` | Disconnected (player chip greys out) |

### Brand theme: Indigo
Indigo is the app's signature color. All UI chrome (backgrounds, cards, text, tracks, icon buttons) is built from this indigo family, so the app feels indigo everywhere while player colors stay reserved for players.

| Name | Hex | Use |
|---|---|---|
| Indigo | `#4F46E5` | Brand color, primary buttons, active states, slider tracks |
| Deep Indigo | `#2E2A8C` | Card bodies, dark pills, premium buttons |
| Indigo Ink | `#312E81` | Headings, body text |
| Soft Indigo | `#A5A8F0` | Icon buttons (back, close, menu), secondary glyphs |
| Lavender Wash | `#EEF0FF` | Screen background |
| Indigo Mist | `#DCDFFB` | Header bottom border, blob shapes |
| Night Indigo | `#1E1B4B` | Game board interior, dark mode base |
| White | `#FFFFFF` | Card frames, panels, headers |
| Off Gray | `#C7C9D9` / `#5F6075` | Toggle off track / knob |

Indigo is not a player color; no player is ever assigned it.

### Rules
- Never use a player color for a non-player meaning on a screen where players are present.
- Backgrounds are pale or a single saturated field; never patterned and busy at the same time.
- Patterned backgrounds (repeating mascot icons) run at ~15% contrast against the base.

---

## 3. Typography

- **Display / Buttons:** Ultra-heavy rounded or geometric sans (Black/Heavy weight), ALL CAPS, tight tracking. Examples of the feel: Lilita One, Baloo 2 ExtraBold, Fredoka Bold.
- **Body / Labels:** Same family at Bold, sentence case (settings rows, player names, legal text).
- **Numerals:** Oversized and treated as illustrations — big, bold, often in player colors.

| Token | Size (mobile) | Weight | Case |
|---|---|---|---|
| `display` | 40–56 | Black | UPPER |
| `title` | 32 | Black | UPPER |
| `button` | 22–26 | Black | UPPER |
| `label` | 22 | Bold | Sentence |
| `caption` | 14 | Bold | Sentence |

- Logo-style text gets a thick white outline plus a dark outer stroke ("sticker" treatment).
- Text on colored pills is white; text on dark pills takes a tint of the card's theme color.
- Player names truncate with an ellipsis; they never shrink below `caption`.

---

## 4. Shape & Depth

- **Radius:** generous. Pills are fully rounded; cards 28–36px; panels 48px+.
- **Outlines:** 4–6px solid dark strokes (Deep Indigo or a dark player variant) around primary buttons and game pieces.
- **Lip shadow:** a solid, non-blurred offset of 4–8px straight down in a darker shade. No soft drop shadows.
- **Blobs:** soft organic white/Indigo Mist shapes behind content groups to break the grid.
- **Sunburst fan:** a radial-sunburst disk in a player's color, used behind that player's avatar on turn banners and results.

---

## 5. Components

### Mode card
Deep Indigo rounded body → giant colored numeral or icon breaking out the top edge, flanked by "speed lines" → full-width colored pill label at the bottom (`QUICK MATCH`, `PRIVATE ROOM`, `TEAM PLAY`).

### Game tile
White frame (~12px) around a square illustration with rounded corners → bottom-anchored pill label in a dark, semi-transparent shade of the illustration's dominant color, with the title in a bright tint of that color.

### Player chip
Rounded pill: avatar circle in the player's color (thick dark outline) → display name → optional score or status dot. The local player's own chip is marked with a `YOU` tag and a thicker outline. Disconnected players grey out at 40% opacity.

### Lobby / room
- Large room code in `display` type inside a white panel, with copy and share pill buttons.
- Players listed as a wrapping grid of player chips, each with a ready state (Online green check / Waiting yellow dot).
- Host is marked with a small crown badge.
- One dominant CTA at the bottom: `START` for the host, `READY` for others.

### Pill button
Fully rounded, solid fill, optional left icon in a circle, ALL CAPS label. Primary CTAs use Indigo; premium/utility CTAs use Deep Indigo; invite/share CTAs use Grass Green with a pale halo ring.

### Icon button
Square-ish rounded tile (Indigo with Deep Indigo outline) or bare Soft Indigo glyph for back / close / menu. Glyphs are thick and round-capped.

### Header
White bar, title in Indigo Ink `title` style, back/close at left, 4px Indigo Mist line underneath.

### Settings controls
- **Slider:** thick rounded Indigo track, gray remainder, large white circular thumb with a Deep Indigo outline.
- **Toggle:** fat pill track; on = Indigo track + white knob; off = light gray track + dark gray knob.

### Ribbons & badges
Diagonal corner ribbon, "NEW!" in Player Yellow, slightly tilted.

### HUD counters
Dark rounded bar with white bold number, icon (gem, coin) overlapping the right end.

### Turn banner
- **Your turn:** a huge circle in your color bleeding off the top edge, with curved white `YOUR TURN!` text and your avatar on a sunburst fan.
- **Someone else's turn:** a slim pill at the top in that player's color showing their avatar and `NAME'S TURN`, so it never competes with your own controls.

### Scoreboard & results
Vertical list of player chips ranked by score, the leader enlarged with a crown. On results, the top three get a podium in their colors; the local player's row is always visible (pinned if it scrolls off).

### Connection feedback
Small status dot on each player chip. Reconnecting shows a yellow pill toast at the top; connection lost shows a white modal with a single `RECONNECT` button.

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
- Quick (150–250ms); no slow fades.

---

## 9. Voice in UI

Short, shouty, playful: `OOPS!!`, `YOUR TURN!`, `INVITE FRIENDS!`. Exclamation marks welcome; jargon is not.
