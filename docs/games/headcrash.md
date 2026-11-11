# Head Crash

Format: **tournament**, played **live** (real time, 1v1). Catalog id `headcrash`, 2–8 players in the room; each match is two players.

Two small cars in a world seen from the side (caves, islands, cliffs, water rising below), with gravity. Two buttons: drive left, drive right. Drive up the walls, jump, flip, and land on the other driver's head. Anything touching your own head gives the point away.

> This doc is Head Crash's source of truth: rules, owner decisions, how it works, its look and its files. Platform-wide rules, the tournament format and the room flow are in [`CLAUDE.md`](../../CLAUDE.md); the shared visual language is in [`DESIGN.md`](../../DESIGN.md). Update this doc in the same change whenever something about Head Crash changes.

---

## Rules (owner decisions, 2026-11-10, unless marked)

- **1v1, as a tournament, like tic-tac-toe:** with more than two players in the room everyone plays a 1v1 each round at the same time (Swiss pairing, points, byes, shared titles: all the platform's). Whoever is free watches any live match.
- **Controls:** two buttons each, LEFT and RIGHT. Cars don't move on their own: a button drives the car that way. In the air the same buttons turn (flip) the car. Both at once is the same as none.
- **Scoring:** a round ends the instant a driver's head is touched.
  - The other car touches your head: the other driver gets 1 point.
  - **Your own crash counts too:** your head touching the floor, a wall or a block gives the other driver 1 point (never a minus).
  - **Both heads at the same moment:** no point; the round is played again on the next map.
- **Match:** first to **5 points** wins.
- **Rounds:** each round starts with the cars at opposite ends, then a short 3, 2, 1. After a hit: an effect at the impact, a short pause, then the next round **on the next map**.
- **Maps (owner, 2026-11-11: the old arenas "didn't make sense" and repeated; the reference was a game whose world fills the screen):** hand-made maps, a new one every round, in an order shuffled per match so none comes back until all have been played. Caves have rock all round; open maps are islands and cliffs in the sky, and whoever falls off lands in the water. **8 maps** (owner, 2026-11-11: a match is 5 to 9 rounds, so nearly every match shows each map once and players get to know them). **Every map must change how a round is played, and what makes it different must be usable** (owner: a map only different to look at, or with something nobody can reach, is a waste); each new map has a test that its feature works from the start.
  - Kept from the first set: **bowl** (ride the curved walls and drop), **ring** (a rock in the middle, made a little wider: over, under or round it, or hide under it), **valley** (start high on ledges and dive), **ramps** (a kicker on each side facing the middle: both take off and meet in the air).
  - **trampoline:** a bounce pad in the middle of the floor throws any car that touches it high: bounce when the other is under you, keep off it when they are above you.
  - **fan:** rising air in the middle holds a car up about 60% of the way to the ceiling; in it the buttons steer the car sideways: float over the other car and drop on it.
  - **lift:** a slab in the middle that waits, rises, waits and comes down by itself: ride it up and drop on the other car; under it your head is in danger.
  - **floors:** a top floor out of each wall with a hole in the middle; the cars start on top. Drop through the hole onto the head below; under the top floor your head is safe. A small bounce pad under the hole throws a car crossing it back up onto the top floor. (A ramp up can't work in a side view: it would wall off the space under it.)
  - Dropped (owner): the hill, the pit, the bumps, the hanging planks, the island, the rock tower, the steps, the bridge and the gap from the first set; pinball (floating round rocks), fang (a rock hanging from the ceiling), dome (start in low tunnels) and skate (a halfpipe in the sky), which only looked different; ice (no grip) and moon (low gravity), which changed only how the car feels everywhere, nothing to use against the other player; cannons (fired back out of a wall), warp (in at a wall, out of the ceiling) and seesaws (owner: not usable).
- **Water:** a band along the bottom of the screen, below every floor. About 20 s into a round it starts to rise and covers the whole map in about 15 s. A head under water is a hit (falling off an open map ends that way): the other driver scores. Both under at once: no point.
- **Cars:** every car has the same shape, in its player's color. The driver's head sticks out of the top: that is the target. Cars are solid: they bump and push each other. A little smaller against the maps than at first (owner, 2026-11-11: more room to drive; the maps are drawn 1.15 times bigger, `arena.mapScale`).
- **Cars on springs (owner, 2026-11-11: "the car can also tilt when on the ground", like the 2-player crash games):** each wheel sits on a spring and the push comes from the tyres, so the car leans back when it sets off, dips its nose when it brakes or turns round, rocks over bumps and bounces when it lands, all on the ground, not only in the air.
- **Lifting on the ground (owner, 2026-11-11: "i cant lift the car off the ground at all"):** on the ground the buttons also lift the car, the same way round as they turn it in the air: setting off pops a wheelie, braking lifts the rear. The lift is strongest from slow and fades as the car reaches top speed (so a car racing down a slope or onto a jump stays on its wheels), and it stops at a limit short of where the car would fall over backwards: holding gives a steady wheelie, letting go drops it back, and mashing never flips a car by itself. (A lift with no limit made cars flip over on their own.)
- **Screen:** landscape suits it best (the map's frame is as wide as a phone held sideways). In portrait the map sits in the middle (owner), with more sky or rock above it and the sea below.
- **Smoothness (owner requirement):** on a normal connection nothing may teleport, glitch or lag, neither your car nor the other one. See [How it works](#how-it-works).

Decided without the owner (may be changed):

- **Nobody playing:** 3 rounds in a row with no point end the match as it stands (higher score wins; level is a draw). Without this, two idle players would keep the server awake for ever.
- **Fair maps:** every map is the same on its left and right half, and the cars start as mirror images, so neither seat is better.
- **Which way the buttons flip the car in the air:** RIGHT turns it counter-clockwise, LEFT clockwise. That is what a real car does when its wheels spin up, and it means the button that drove you up a wall keeps you turning over the top.
- **What touched the head:** when a landing car pushes your head into the floor, it counts as the car's hit, not the floor's (the point is the same; only the look differs).
- **Quitting:** the platform's rule. The other driver wins the match, whatever the score.
- **Away players** (locked phone, lost connection): their car keeps the buttons it last had. A window that loses focus lets go of both.
- **Server restart mid-match:** the match carries on from its score, in a fresh round (the room keeps the score after every point).

## Numbers (`src/shared/games/headcrash/config.ts`)

Meters, seconds, y up. 60 steps a second; the server sends the whole state 30 times a second.

- Match: 5 points to win; 3 rounds without a point end it. Countdown 3 × 1 s before a match's first round, 3 × 0.6 s before later ones. Pause after a hit 1.4 s.
- Water: 1 above the frame's bottom; starts rising after 20 s, above the frame's top 15 s later.
- Car: about 2.3 long. Two wheels (radius 0.48), a body of three discs, and the head (radius 0.34) on top. Gravity 28.
- Driving: top speed 15, acceleration 32, limited by grip (1.3 × how hard the wheel presses on the ground); with no button it slows by 5 a second. 0.5 of the tipping from the tyres' push reaches the body (a lean of about 6° setting off). The buttons' lift on the ground: toward 3 rad/s, 16 rad/s², easing off over the last 0.25 before its limit of 0.45 (about 26°; owner: the first 0.6 lifted more than needed) from the ground under the wheels; a car falls over backwards past about 0.8. The car's resistance to turning is 0.7. In the air: turns up to 4.5 rad/s, picking up 30 rad/s², and letting go stops a spin quickly (3 a second), so a landing can be lined up and held.
- Picked by Claude from the owner's notes (2026-11-11: braking flips too easily, a landing off a wall can't be controlled, the car rushes forward), as a start for the owner to tune: calmer, heavier, less floaty than the first guess, but still fast enough to fly off the ramps.
- Springs: stiffness 80 and damping 7 (per unit of the car's mass), 0.34 of travel before a wheel hits the body; standing still each is squeezed 0.175. Bounce off the ground 0.12.
- Maps: drawn on a frame from x = -15 to 15 and y = -3 to 12 (30 × 15, wide and low like a phone held sideways; the main floor is at y = 0), all scaled up 1.15 (`arena.mapScale`), so every screen shows x = -17.25 to 17.25; the world fills the rest of the screen. A car is about a fifteenth of the frame's width.
- Gadgets (picked by Claude, for the owner to try): a bounce pad throws a car off at 18 (about 6 m up); a fan blows up 2.6 times gravity at its bottom, fading to nothing at its top, slows rising and falling by 1.5 a second, and its buttons push sideways at 12; a lift waits 1.5 s, moves 2 s.

**The driving feel is a first guess** (speeds, grip, air spin, springs, map sizes): the owner is tuning it (owner, 2026-11-11: "give me a value changer instead of guessing"). `?preview=headcrash` has a tuner: a slider for every number of the driving's feel, live as you drive; it shows what changed, to copy and send, and the chosen values then go into `config.ts`. Tuned values are kept in that browser until `config.ts`'s numbers change; then it starts from the new ones.

---

## How it works

- **Simulation (`src/shared/games/headcrash/`):** our own small physics, pure and deterministic (no library, so the phone and the server run exactly the same steps).
  - A car is one rigid body (position, angle, speed, spin) made of 5 solid discs (2 wheels, 3 for the body) plus the head, which is not solid: it only detects hits.
  - The ground is closed outlines of short straight pieces (curves are many pieces), each walked with the open air on its left: a cave's play space one way round, solid islands and cliffs the other, so the same contact code works for both. Planks are turned rectangles. A grid over the frame says which pieces are near, so a step looks at a handful. Open maps keep tall cliffs where a car could fly off the side; a car thrown off an island falls into the water.
  - Contacts are solved 8 times per step with small pushes; they are found a little before touching, so a fast car slows into a wall and never passes through it. Nothing is carried from step to step but the two cars, so the whole match state is tiny.
  - Each wheel is on a spring: a wheel touching the ground may sink into it up to the travel, pushed back by the spring (stiffness × squeeze − damping × closing speed, never pulling); only past the travel is it solid. A disc is pushed out through a piece of outline only while its middle is at most `WALL_DEPTH` (0.5) inside the ground; deeper, that piece is the ground's far side and is ignored. So ground must be thick enough that a wheel squeezed all the way stays clear of its underside (a test checks every map). The tuner's travel stops at 0.45 for the same reason. The sinking stands for the spring's squeeze, and the drawing moves the wheel up into its arch by that much (`wheelSink`), so the body rides on its wheels.
  - Driving pushes each wheel along the ground it presses on hardest, no harder than its grip allows, at the point where the tyre touches the ground (its speed measured at the hub). That point is below the car's middle, so the push also tips the body (`drive.lean` of it): the nose lifts setting off and dips braking. The buttons also lift the car on the ground: its turn from the ground under its wheels (their contact normals) is eased toward `drive.tiltMax` and held there, as hard as the car is short of top speed along the ground the button's way. No wheel on the ground: the buttons turn the car instead.
  - Every piece of ground has a surface (`SURFACE`: rock or bounce pad), from its outline in `maps.ts`. A car touching a bounce pad's top (a piece facing up) is thrown straight up as a whole (its upward speed set, nothing else), so a car crossing a pad keeps its speed and flies on; a pad's edges are plain ground, since a throw off its sides sent cars back the way they came.
  - A fan is a box of rising air: on a car whose middle is in it, it adds lift (less higher up) and damping, and there the buttons push sideways instead of turning the car.
  - A lift is a slab whose height follows a fixed timetable from the round's play time (`liftAt`), so nothing about it needs sending; contacts with it use its speed. After a hit it stays where the hit left them (the hit records the round's play time).
  - A whole match is one state: rounds, countdown, the pause after a hit, the score and the water are all part of `stepHeadCrash`, so both sides agree on them without extra messages.
  - Maps are drawn by hand in `maps.ts` from a few corners each, every corner rounded by its own radius, plus smooth floor curves (`shapes.ts`); the left half is the right's mirror image. `layoutFor` gives round n the n-th map of the match's shuffled order.
- **In the tournament:** a Head Crash match's record holds only its score (`LiveMatch`). The server plays the match in memory and tells the tournament about each point (`scoreLiveMatch`) and the end (`finishLiveMatch`); moves and turn timers don't exist for it.
- **Server (`src/server/duel/`):** `DuelService` runs the matches the room's record says are live (a round's matches side by side), each streamed only to its two players and to whoever watches it. After every change to the room it compares what runs with what should (`reconcile`): that starts a round's matches, stops one whose player quit, and restarts one the server lost. The loop runs only while a match does, so the Durable Object sleeps otherwise. After a stall it skips time instead of racing through it.
- **Wire (binary, `wire.ts`):** server → phone: the whole state (two cars as 32-bit floats, score, round, phase, the hit, each player's last applied button change, late count, and button changes still to come), about 80 bytes; and pong. Phone → server: buttons (only when they change, stamped with the step they act on), ping, watch / unwatch. Every frame names its match, since a room runs several.
- **Client netcode (`src/web/games/headcrash/engine/headCrashClient.ts`):**
  - **Players see the whole match a little ahead of the server** (half the round trip + 2 × jitter + 20 ms), played with the same simulation. Your button acts on the very next step on your screen and reaches the server just in time for that same step, so your own car never waits for the network and is never corrected for your own driving.
  - **Both cars are played ahead together**, because they push each other. The other car carries on with the buttons its driver last held (the server also sends button changes it already knows are coming).
  - Thirty times a second the server's word arrives. The match is replayed from it to the present. If that moves a car from where it was drawn, the car **stays where it was drawn and the difference fades out** (70 ms half-life), so a correction is a glide of a few frames, never a jump. Only a difference over 5 m is taken at once (a new round, a phone that slept).
  - Between steps, cars are drawn at the exact in-between position for the frame, so 60 steps a second look smooth on any screen rate.
  - The lead is re-measured with every ping but eased into (at most 6% faster or slower meanwhile); in the countdown, where nothing moves, it is taken at once, so the 3, 2, 1 keeps its pace. The round trip and its jitter are medians of the recent pings (the shared `serverClock.ts`), so one pong read late (the page was busy for a moment) never moves the lead or the clock. Buttons that still arrive late add a little lead for a while.
  - **A hit you see coming freezes the cars at once; the burst, the sound and the point wait for the server's word,** so a point never shows and then disappears.
  - **Watchers** need no guessing: they see the match about 90 ms in the past, drawn smoothly between snapshots.
  - No snapshot for 1 s while the match should be live: the phone sends a frame the server must look the match up for (this is what restarts a match after a server restart).
- **Measured** (tests, simulated line of 40 ms each way with jitter): your own driving is never corrected and no button arrives late; when the other driver mashes buttons, corrections stay under half a meter and no car moves more than a normal frame's travel between two frames. On a local connection the largest correction in whole matches was 0.06 m.

## Cost (free tier)

The DO stays awake while a match runs, and every button change is a DO request (billed 20:1). Measured: a step takes about 0.01 ms, so a match uses about 0.6 ms of CPU per second; a snapshot is about 80 bytes (2.4 KB/s per player or watcher). A match of two button-mashing bots lasted 3.6 minutes on average (about 9 rounds); real matches should be shorter. Each point writes the room once. Watch the DO request and GB-s numbers once people play it.

## Look

- **World (owner: the world should fill the screen, like the reference, without copying it):** the whole screen is the world; the map's frame always shows whole and the rest of the screen is more of the same. A pale lavender sky with soft round hills far behind and a few white clouds; the ground in indigo with darker round pebbles and an ink outline; planks and lifts the same as the ground. Coral marks whatever throws or moves a car: a bounce pad set into the floor, a fan's grille (its rising air faint white streaks). Colors are the theme's game-world tokens (DESIGN.md, Game worlds). Flat, no lips or shine. What never moves is drawn once per map and screen size; nothing scrolls. Pebbles are made only for what the screen shows (each spot of the grid has its own random numbers, so they stay put whatever the size) and drawn as Bézier curves: `Path2D.ellipse` slows down as a path grows, and a whole map's pebbles once froze the start of every round for most of a second.
- **Cars:** an open-top cartoon roadster, the same for everyone in its player's color (owner: the earlier capsule and kart looked like "a pill with a head", a closed coupe with the helmet on its roof "still feels odd", an off-roader was "more of a monster car than a normal car", and the teardrop racer's front "is weird": make it like the open-top, no-roof cars). A chunky tub: an open cockpit with the driver's shoulders showing, a tall windscreen in pale glass blue standing on the hood well ahead of the face (nearly as tall as the helmet; owner: the first one was too short next to the head, the next too close to it), and a hood sloping down to a rounded nose. Behind the driver, a low flat back deck and nothing over it, so the helmet sits in the open (owner, 2026-11-11: picked from three backs, a rounded headrest, a fin and a roll bar: the roll bar's back, without the bar). Wheels: ink tire, a rim in the car's color with a darker hub and white lug dots that turn. They are drawn where the tyres meet the ground (up by their springs' squeeze): standing still their tops tuck under the round fenders, on a hard landing they push up into them, in the air they hang clear. A white racing stripe along the side (white shows on every player's color), a round yellow headlight on the nose, a coral light on the tail, an exhaust pipe under the tail. Flat colors, no shine. The driver's helmet sits in the cockpit: flat and round, exactly as big as what counts as a hit, with a racing stripe in the player's color and a dark visor on the side the car faces. The body covers the car's solid shape (nothing reaches much further than the tires), so cars touch where they look like they touch. Dust puffs behind a driven wheel. A small arrow in your color bobs over your own car at the start of each round.
- **Water:** royal blue (never a player's color), in front of everything and across the whole screen, with a pale wavy band on top. Once it rises the band turns coral and blinks.
- **A hit:** a spiky white burst and a ring at the impact and the view shakes. The hit head stays on (owner: no head flying off): it flashes white, squashes flat down into the car and wobbles back, its visor shows ✕ ✕ eyes, and dizzy stars circle above it until the next round (a splash instead of the burst when the water took it). Everything else holds still.
- **Screen (owner: the score bar and side columns took room and looked sloppy):** the world fills the screen; the rest floats over it, small, at the edges. The score is a little white tab hanging from the top edge: each driver's points on a disc in their color, on the side their car starts on; a new point pops. The ✕ to quit in the top left corner. The platform's countdown disc counts 3, 2, 1 in the middle.
- **Buttons:** two small round white buttons with a solid, soft-cornered triangle (`DriveArrow`), one in each bottom corner over the world (owner decision: the big pads looked bad); a held one sinks and takes your color. Each takes the touch over its whole half of the screen, so a thumb never has to aim. On a phone held sideways they sit beside the map's frame, over the water and rock; maps keep their starts clear of those corners. Keyboard: arrows or A / D.
- **Ending:** the platform's result tag stamps on near the bottom (YOU WIN! in your color with a trophy and confetti, YOU LOST, DRAW!, or who won when watching), with tournament points, then the room moves on by itself.
- **Between rounds of the tournament:** the round intro says GET READY! instead of counting, since the game counts 3, 2, 1 itself.
- **Tile:** a red car coming down on a blue driver's head in a rock bowl in the sky, the burst between them, the water in front along the bottom. The cars are drawn by the game's own car code (`drawCar`), so the tile always matches the game.

## Sound

Rubber and weight (`sounds.ts`): driving is silent, so the moments stand out. Your landing after a jump (two takes, soft and hard), the cars knocking together, and the hit: a fat pop and two notes up when it's your point, a low blow and two notes down when it's your head, a knock and a scatter when it's nobody's (both heads); in a match you watch, just the knock, from further away. The water has a soft wash when it takes a head and a low swell when it starts to rise. The 3, 2, 1, GO and the result are the platform's sounds.

## Haptics

Felt (`haptics.ts`): your own landings (light), the cars knocking (medium), your point (a hard hit and its echo), your head being hit (two hard hits, fading), both heads (one knock). A match you watch is not felt. Holding a button is not felt, and the drive buttons carry no iPhone tap target (a switch under a held thumb could get in the way of driving), so an iPhone feels nothing during play.

## Files

| Path | Purpose |
|---|---|
| `src/shared/games/headcrash/config.ts` | Every gameplay number, the button bits, `buttonDirection` |
| `src/shared/games/headcrash/types.ts` | Car, wall (with its surface: rock or bounce pad), block, lift, fan, what moves at a moment (`Motion`), layout, phases, hit, the match state |
| `src/shared/games/headcrash/random.ts` | Seeded random numbers; the match's seed from the tournament's and the match id (`matchSeed`) |
| `src/shared/games/headcrash/maps.ts` | The maps, drawn by hand (`MAPS`: name, cave or open, outlines and what each is made of, planks, where the cars start, lifts, fans) |
| `src/shared/games/headcrash/shapes.ts` | Drawing tools for maps: corners rounded by their own radius, mirrored halves, floor curves (`hump`, `ease`) |
| `src/shared/games/headcrash/layout.ts` | A map ready to play (`mapLayout`): outlines turned the right way, pieces, collision grid, starts, lifts, fans; `restSink` and `rideHeight` (how a car stands on its springs); the lifts' timetable (`liftShare`, `liftAt`), the lifts as they stand (`slabsAt`, for drawing); the map of each round (`layoutFor`) |
| `src/shared/games/headcrash/physics.ts` | One step of both cars (`stepCars`: contacts, wheel springs, driving, bounce pads, lifts, fans), what touched a head (`findHit`), `headOf`, how far each wheel is squeezed (`wheelSink`, for drawing), the step's report (wheels on the ground, impacts) |
| `src/shared/games/headcrash/simulation.ts` | The whole match (`createHeadCrash`, `stepHeadCrash`): rounds, countdown, water, score, the end; what moves in the map as it stands (`motionOf`) |
| `src/shared/games/headcrash/wire.ts` | Binary messages (snapshot, pong; buttons, ping, watch) |
| `src/server/duel/` | `duelService.ts` (which matches run, who gets them, reports to the room), `headCrashDuel.ts` (one match on the server's clock, queued buttons), `config.ts` |
| `src/web/games/headcrash/HeadCrashScreen.tsx`, `useHeadCrashGame.ts`, `loadHeadCrash.ts` | The screen; the loop that runs netcode, drawing, buttons and sound; its own download |
| `src/web/games/headcrash/config.ts` | Client numbers: netcode timing, the view, the look, the overlay, sound |
| `src/web/games/headcrash/engine/` | `headCrashClient.ts` (netcode), `frame.ts` (what a frame (with where the lifts are), a moment and the overlay hold) |
| `src/web/games/headcrash/render/` | `headCrashRenderer.ts`, `drawWorld.ts` (sky, hills, clouds, ground and pebbles, bounce pads, fans and their air, planks, lifts; water in front), `drawCar.ts` (car, head, your arrow), `drawEffects.ts` (burst, flying head, splash, dust), `view.ts` (fitting the frame, what the screen shows), `palette.ts` |
| `src/web/games/headcrash/input/driveInput.ts` | The two buttons from fingers and keys |
| `src/web/games/headcrash/hud/` | `ScoreBar` (a score card per driver, placed by the screen's grid; no lip: it isn't tapped), `DriveButton`, `DriveArrow`, `HeadCrashEnding` |
| `src/web/games/headcrash/HeadCrashArt.tsx` | The game tile |
| `src/web/games/headcrash/sounds.ts`, `haptics.ts` | Its sounds and feels |
| `src/web/games/headcrash/headCrashCues.ts`, `headCrashAudio.ts` | Which sound for what (pure), and playing them from the game loop |
| `src/web/preview/headcrash/HeadCrashPreview.tsx` | Dev page `?preview=headcrash`: the game on one keyboard (or red by touch, left or right half) with no server, to tune the driving and look at the maps (a map picker keeps every round on one map, or every map shuffled as in a match; RESTART ROUND plays the map again, SKIP ROUND goes to the next; the bar names the map) |
| `src/web/preview/headcrash/TuningPanel.tsx`, `tuning.ts` | The preview's tuner: a slider per number of the driving's feel (`KNOBS`), written straight into the config on that page only, kept in the browser, with the changes listed to copy |
| `scripts/playtest/headcrash.mjs` | Playtest: start, driving on both phones, a hit and the next round, a late watcher, the match's end, the results |
| `tests/headcrash.test.ts` | Maps (closed, mirrored, thick enough for a squeezed wheel, fair starts clear of the water and the buttons, each once per match), driving (springs: settling, bouncing on landing; the lift: a wheelie setting off within its limit, the nose down braking, back down when let go, level at top speed, never flipping itself on the flat; driving off the start toward the other car on every map), each map's feature usable (the trampoline throws a car high, a car on the bottom of the two floors gets back on top, a fan holds a car up and steers it, a lift carries a car up), lifts and fans mirrored, hits, rounds, water, the end, wire, the server's clock and buttons |
| `tests/headcrashNetcode.test.ts` | The netcode over a slow line: own buttons never corrected, no jumps, hits only on the server's word, watching, a restarted server |

## Ideas for later

- Tune the driving on real phones with players; more maps, and planks that tip or move.
- A short replay of the hit in slow motion.
- Engine sound that follows speed (kept silent for now).
- Rewards for style (a flip before the hit).
