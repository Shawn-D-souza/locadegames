# Launch video

The platform's launch / demo video: what it must say, how it looks and sounds, and its script. Owner decisions unless marked. Built one step at a time, each approved by the owner (brief, concept, script, music, look, build, polish).

---

## Brief

- **Goal:** make people want to try the platform with their own friends.
- **Format:** landscape 16:9 is the main version. A vertical 9:16 version comes from it, recomposed so the landscape version is never compromised.
- **Length:** about 52 s, set exactly by the music.
- **Footage:** the real app (its real screens and games) animated in code, inside phone frames, with camera moves. The timing of a moment may be fitted to the music (Territory's 3, 2, 1 in three beats), but nothing is shown that the app can't do.
- **Tone:** fun and energetic, but clean and professional. One idea on screen at a time; the fun comes from the platform's own colors, sounds and celebrations, not from piling things on screen.
- **No voiceover:** on-screen text only.
- **Must say:** play with your own friends, everyone on their own phone, in a private room with a code, no bots, nothing to download, free.
- **Never:** tie the platform to a time of day ("game night"), or name other apps.

## Concept

C's hook (a group chat) into one continuous camera move across the dotted page (B), with phones (A) when friends join and at the ending.

- **The phones float on the dotted page** (no setting): the room splits into four phones that slide in from four edges. Rejected: phones in illustrated places (backgrounds looked bad), phones round one table (why not one board, then?), a dotted world map and city tags.
- **Territory is the game in Act 2**, not Ludo (Ludo has many apps): one match, four phones, each camera following its own player, which only separate phones can do.

## Script

Approximate times; they are fitted to the music.

**Act 1: Hook (0:00–0:08).** A group chat in the app's style (white cards, ink outlines, player colors) on the dotted page, one bubble per beat, spaced to be read:

> **Ben:** anyone up for ludo?
> **Mia:** only if we're not passing one phone around again
> **Leo:** lol that took forever
> **Ana:** found something. everyone plays on their own phone
> **Ana:** and it's not just ludo
> **Ana:** *[invite card: JOIN MY ROOM · 482 913]*

The camera pushes into the code.

**Act 2: How it works (0:08–0:20).** The code opens out into the real room screen. Four phones slide in from four edges, one per beat; each friend's bar pops onto every phone with their note. Text: **EVERYONE ON THEIR OWN PHONE.** Ana taps Territory; 3, 2, 1, GO on the beats. One match, four views. Text: **NO BOTS. JUST YOUR FRIENDS.** The camera dives into Ana's screen (riser, a short silence).

**Act 3: The games (0:20–0:40), the drop.** Pool's break on the drop; Carrom (a pocketed ball comes out as the striker); Dots Clash (the chain explodes on the beats); Head Crash (a flip onto the other car's head, `+1`); Chess (checkmate); eight one-beat flashes: Memory, Ludo, Snakes & Ladders, 4 in a Row, Sea Battle, Checkers, Dots & Boxes, then tic-tac-toe zooming out into Ultimate Tic-tac-toe. The room's full games grid. Text: **PICK ANY GAME. PLAY TOGETHER.** (owner decision: no count of games; a number sounds like a limit).

**Act 4: Payoff (0:38–0:53).** The group chat from the start again, now as **Zoe** sees it (a fifth friend, out of town, in the fifth player color): it scrolls down past everything the others said, then one message a beat (owner decision: the chat, not the end of a game, which made no sense after the montage):

> **Zoe:** ugh i'm so bored
> **Zoe:** sad i'm not in town with you guys
> **Ben:** you can still play! it's online
> **Ana:** same link, join from there
> **Zoe:** wait really?? joining now!

Text, one part per beat: **PLAY WITH YOUR FRIENDS.** → **ANYTIME.** → **ANYWHERE.** The logo builds piece by piece on the beats, then **LOCADE GAMES**, *Free · In your browser · No download* and `locade.pages.dev`.

## Music

Original, made by our own code (owner decision: full freedom, no license), written to the script rather than the video cut to a track. In D major pentatonic, the scale of every app sound, so the app's sounds can play inside it in tune. Shape: a quiet intro the chat can be read over, a build for the friends joining and the countdown, a drop at about 0:20, a clean ending for the closing line.

- **Style: toy-box pop** (owner pick from four sketches: toy-box pop, bouncy house, future bass, funky groove). Mallets, a bell-like electric piano (FM tine) and glockenspiel carry the tune over punchy pop drums and a warm bass; the closest to the app's own sounds.
- **120 BPM, one bar = 2 s**, so the script's times fall on beats. Chords: D, Asus2, Bm, G6/9 (every upper note pentatonic; G only as a bass root).
- **The four phones** slide in on the app's own player notes (Ana A4, Ben B4, Mia D5, Leo E5), so the app's join sounds sit inside the song. The music leaves room for the app's champion trumpets at the champion card.
- **Sync points** (cues) are written out with the music, so the picture is cut to the exact times.
- **Sound effects are the app's own sounds**, on their moments: each friend's chat message on that friend's player note, Ana's invite on `roomCodeComplete`.

## Look

Built from the app's own design (DESIGN.md) and its real components. Style frames: `npm run stills`.

- **Frame:** 1920 × 1080, 60 frames a second.
- **Soft dots** (owner pick from app / soft / none, tested in motion and compressed like the platforms do): the app's dot grid, lighter (22%) and further apart (44 px). Full-strength dots shimmered and smeared once compressed and needed twice the bitrate; no dots felt empty. The app itself keeps its dots.
- **The app's screens are real:** each is rendered on its own at a real screen's size (a phone: 390 × 844 at 3x, with a status bar; held sideways: 844 × 390), so the app's `vw`, `dvh` and portrait / landscape layouts behave as on a phone, then placed into phones in the frame.
- **Phones** are drawn in the app's style: an ink body, a solid ink lip, no shadows, tilted a little. A name tag in each friend's color under each phone.
- **Games in the montage play on Ana's phone held sideways** (owner pick over the game filling the frame): every game reads as "on your phone", and the camera moves the phone between games.
- **Text** sits in a white card with an ink outline (never straight on the dot grid), in the display font.
- **Chat:** friends' bubbles white on the left, Ana's in her red on the right; the invite is the app's tab card with the real room code box.

## How it's made

From `video/` (needs the project's own `npm install` at the root too: the app's code and React come from there):

- `npm install` once.
- `npm run sfx`: copies the app's own sounds (rendered by the app's `npm run sounds`) into `public/sfx/`.
- `npm run music`: makes the music (`public/music.wav`) and its sync points (`src/cues.json`), entirely in code.
- `npm run stills`: renders the app's screens, then the style frames into `out/frames/`.
- `npm run clips [clip ...] [-- --draft]`: renders the app's moving screens as clips into `public/screens/` (`--draft`: at 1x, much faster, for previews).
- `npm run preview [-- --frames=a-b]`: a quick 960 × 540 render to judge (`out/preview.mp4`), from draft clips (`npm run clips -- --draft`; with full-size clips the four phones of Act 2 render about 14 times slower). Every step is approved from these; only the final render (`npm run render`, after `npm run clips` at full size) is at full quality.
- `npm run studio`: Remotion's editor, to preview.

## Files

| Path | Purpose |
|---|---|
| `music/` | The music in code: `engine.mjs` (instruments, effects, mastering), `common.mjs` (mix, chords), `track.mjs` (the track, written to the script) |
| `src/cues.json` | When every synced moment happens (written by `npm run music`) |
| `src/Root.tsx` | Every composition: the app's screens at real size, the style frames |
| `src/look.ts`, `src/cast.ts` | The video's numbers on top of the app's theme; the four friends and their room, and Zoe (the fifth friend, in the chat only) |
| `src/screens/` | The app's real screens set up for a moment, rendered as clips: `clips.ts` (each clip's stretch of the video and its file), `RoomPhoneScreen.tsx` (the room filling up), `TerritoryPhoneScreen.tsx` (Territory on each phone), `PoolTabletScreen.tsx` (style frames) |
| `src/screens/games/` | Act 3's games on Ana's phone held sideways, one clip each, played by the real rules up to a moment on its beat: `script.ts` (a party game's moves at set times, picking the state per frame), `match.tsx` (a 1v1 game in the room's tournament: Ana against Leo), one file per game (`PoolClip`, `CarromClip`, `DotsClashClip`, `HeadCrashClip`, `ChessClip`, and the flashes: `MemoryClip`, `LudoClip`, `SnakesLaddersClip`, `FourInARowClip`, `SeaBattleClip`, `CheckersClip`, `DotsBoxesClip`, `UltimateClip`) |
| `src/territory/` | The friends' Territory match from the game's own simulation (`match.ts`: steered loops, captures on the beats) and each phone's view of it (`view.ts`) |
| `src/clock/` | The video's clock standing in for the browser's in the app's code (`clock.ts`: `Date.now()`, timers, animation frames) and `useVideoClock.ts` (a clip's screen runs it with the video); `scripts/clockLoader.cjs` puts it in |
| `src/parts/` | Pieces of the frame: the dotted page, a phone, the four phones' row (`phoneRow.ts`), an app screen with a status bar, a chat bubble, a text card and a line popping on (`PopText.tsx`), the logo piece by piece (`Logo.tsx`), the camera (`camera.ts`, aiming at measured elements with `useSceneRect.ts`), the app's CSS animations on the video's clock (`useFrameAnimations.ts`) |
| `src/frames/` | The style frames |
| `src/video/` | The video itself: `LaunchVideo.tsx` (music, sounds, acts in order), `Act1Chat.tsx`, `Act2Phones.tsx`, `Act3Games.tsx` (the games on Ana's phone and the flashes) and `Act3Grid.tsx` (the games grid), `Act4Chat.tsx` (Zoe's chat and the closing lines), `Act4Logo.tsx` (the logo and end card), `Sounds.tsx` (the app's sounds on their moments) |
| `src/timing.ts` | Cue times in frames, from `cues.json` |
| `src/stubs/` | Silent stand-ins for the app's sound and haptics players |
| `webpack-override.mjs`, `remotion.config.ts` | The bundler set up for the app's code (Tailwind with the app's theme, one React) |
| `scripts/stills.mjs` | Renders the screens, then the frames |
| `scripts/clips.mjs` | Renders the app's moving screens as clips (`npm run clips`) |
| `scripts/sfx.mjs` | Copies the app's sounds in |
