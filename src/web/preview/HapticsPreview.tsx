import { HAPTICS, HAPTIC_NAMES } from "../haptics/hapticBook";
import { hapticTarget, playHaptic } from "../services/hapticPlayer";

/** Dev-only page (`?preview=haptics`): a button per feel, so the owner can judge them on real phones. iPhones give the same one tick for every button. */
export function HapticsPreview() {
  return (
    <main className="mx-auto flex max-w-content flex-col gap-2 p-gutter">
      {HAPTIC_NAMES.map((name) => (
        <button
          key={name}
          ref={hapticTarget}
          type="button"
          className="flex min-h-tap cursor-pointer flex-col rounded-control border-thin border-ink bg-white px-4 py-2 text-left text-ink"
          onClick={() => playHaptic(name)}
        >
          <span>{name}</span>
          <span className="text-caption text-subtle">{HAPTICS[name].about}</span>
        </button>
      ))}
    </main>
  );
}
