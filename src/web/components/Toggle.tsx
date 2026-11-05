import { clsx } from "clsx";

interface ToggleProps {
  label: string;
  on: boolean;
  onChange(on: boolean): void;
}

/** Pill switch: on = ink track, white knob; off = light gray track, dark gray knob (DESIGN.md, Settings controls). */
export function Toggle({ label, on, onChange }: ToggleProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      // The tap target is the row's full height; the switch itself is smaller.
      className="flex min-h-tap flex-none cursor-pointer items-center"
      onClick={() => onChange(!on)}
    >
      <span
        className={clsx(
          "flex h-toggle w-toggle-track items-center rounded-pill border-thin border-ink p-1 transition-colors duration-fast ease-out",
          on ? "bg-ink" : "bg-off-gray-track",
        )}
      >
        <span
          className={clsx(
            "size-toggle-knob rounded-pill transition-[translate,background-color] duration-fast ease-spring",
            on ? "translate-x-toggle-travel bg-white" : "bg-off-gray-knob",
          )}
        />
      </span>
    </button>
  );
}
