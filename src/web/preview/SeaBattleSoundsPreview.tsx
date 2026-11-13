import { useEffect } from "react";
import { durations } from "../../theme";
import { CANNON_READY_VOLUME, shotVolume } from "../games/seabattle/seaBattleCues";
import { SEABATTLE_SOUNDS } from "../games/seabattle/sounds";
import { playSound, playSoundSequence, prepareGameSounds } from "../services/soundPlayer";
import { matchEndingSteps } from "../sound/cues/endingCues";
import type { SoundDefinition } from "../sound/definition";
import type { SoundName, SoundStep } from "../sound/soundBook";

type SeaBattleSound = keyof typeof SEABATTLE_SOUNDS;

/** How loud the game plays someone else's shot, and the next cannon coming in (yours, theirs). */
const THEIRS = shotVolume(1, 0);
const YOUR_CANNON = CANNON_READY_VOLUME;
const THEIR_CANNON = THEIRS * CANNON_READY_VOLUME;
/** Where a moment's ball lands: yours flies as you let go; theirs swings onto its cell first. */
const YOURS_LANDS = durations.shotFlight;
const THEIRS_FIRES = durations.cannonTurn;
const THEIRS_LANDS = durations.cannonTurn + durations.shotFlight;
/** After a miss the splash has its moment, the boards trade places, then the next cannon comes in. */
const NEXT_CANNON = durations.shotSettle + durations.boardSwap;
/** Aiming across a row: how fast the finger crosses a cell, and how many. */
const AIM_STEP_MS = 90;
const AIM_CELLS = 6;

const GROUPS: { title: string; sounds: SeaBattleSound[] }[] = [
  { title: "Placing your fleet", sounds: ["seaBattleShipPickedUp", "seaBattleShipPlaced", "seaBattleShipTurned", "seaBattleShipDocked", "seaBattleShuffle"] },
  { title: "Firing", sounds: ["seaBattleAim", "seaBattleCannonFire", "seaBattleCannonReady"] },
  { title: "A miss", sounds: ["seaBattleSplash"] },
  { title: "A hit", sounds: ["seaBattleYouHit", "seaBattleYourShipHit", "seaBattleHit"] },
];

/** Whole moments as a match plays them: the same sounds, at the game's own times and volumes. */
const MOMENTS: { title: string; steps: SoundStep[] }[] = [
  {
    title: "You aim across a row, then fire and miss; their cannon comes in",
    steps: [
      ...Array.from({ length: AIM_CELLS }, (_, i): SoundStep => ({ sound: "seaBattleAim", at: i * AIM_STEP_MS })),
      { sound: "seaBattleCannonFire", at: AIM_CELLS * AIM_STEP_MS },
      { sound: "seaBattleSplash", at: AIM_CELLS * AIM_STEP_MS + YOURS_LANDS },
      { sound: "seaBattleCannonReady", at: AIM_CELLS * AIM_STEP_MS + YOURS_LANDS + NEXT_CANNON, volume: THEIR_CANNON },
    ],
  },
  {
    title: "You fire and hit",
    steps: [
      { sound: "seaBattleCannonFire", at: 0 },
      { sound: "seaBattleYouHit", at: YOURS_LANDS },
    ],
  },
  {
    title: "They fire and miss; your cannon comes in",
    steps: [
      { sound: "seaBattleCannonFire", at: THEIRS_FIRES, volume: THEIRS },
      { sound: "seaBattleSplash", at: THEIRS_LANDS, volume: THEIRS },
      { sound: "seaBattleCannonReady", at: THEIRS_LANDS + NEXT_CANNON, volume: YOUR_CANNON },
    ],
  },
  {
    title: "They hit your ship",
    steps: [
      { sound: "seaBattleCannonFire", at: THEIRS_FIRES, volume: THEIRS },
      { sound: "seaBattleYourShipHit", at: THEIRS_LANDS },
    ],
  },
  { title: "Match over: you sank their last ship (you win)", steps: matchEndingSteps("win", { lastMove: { sound: "seaBattleHit", variant: 0 }, line: false }) },
  { title: "Match over: they sank your last ship (you lose)", steps: matchEndingSteps("lose", { lastMove: { sound: "seaBattleHit", variant: 0, volume: THEIRS }, line: false }) },
];

const BUTTON_CLASSES = "min-h-tap cursor-pointer rounded-control border-thin border-ink bg-white px-4 text-ink";

/** One sound: what it's for, its level, and a button per take. */
function SoundRow({ name }: { name: SeaBattleSound }) {
  const { about, level, variants = 1 }: SoundDefinition = SEABATTLE_SOUNDS[name];
  return (
    <div className="flex flex-col gap-2 rounded-control border-thin border-ink bg-white p-4">
      <span>{name}</span>
      <span className="text-caption text-subtle">
        {about} ({level})
      </span>
      <div className="flex flex-wrap gap-2">
        {Array.from({ length: variants }, (_, take) => (
          <button key={take} type="button" className={BUTTON_CLASSES} onClick={() => playSound(name as SoundName, { variant: take })}>
            {variants > 1 ? `Take ${take + 1}` : "Play"}
          </button>
        ))}
      </div>
    </div>
  );
}

/**
 * Dev-only page (`?preview=seabattle-sounds`): every Sea Battle sound, each take on its own button, played by the
 * game's own player from the same files, then whole moments as a match plays them (the same sounds at the game's own
 * times and volumes). With sound on in Settings; the first press wakes the audio.
 */
export function SeaBattleSoundsPreview() {
  useEffect(() => {
    prepareGameSounds("seabattle");
  }, []);
  return (
    <main className="mx-auto flex max-w-content flex-col gap-3 p-gutter text-ink">
      <h1 className="font-display text-title font-black uppercase">Sea Battle sounds</h1>
      {GROUPS.map((group) => (
        <section key={group.title} className="flex flex-col gap-2">
          <h2 className="font-display text-label font-black uppercase">{group.title}</h2>
          {group.sounds.map((name) => (
            <SoundRow key={name} name={name} />
          ))}
        </section>
      ))}
      <section className="flex flex-col gap-2">
        <h2 className="font-display text-label font-black uppercase">As a match plays them</h2>
        {MOMENTS.map((moment) => (
          <button key={moment.title} type="button" className={`${BUTTON_CLASSES} py-2 text-left`} onClick={() => playSoundSequence(moment.steps)}>
            {moment.title}
          </button>
        ))}
      </section>
    </main>
  );
}
