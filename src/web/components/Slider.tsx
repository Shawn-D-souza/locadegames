import type { CSSProperties } from "react";

interface SliderProps {
  label: string;
  /** 0 … 100. */
  value: number;
  step: number;
  disabled?: boolean;
  /** Called on every step as it moves. */
  onChange(value: number): void;
}

/** Rounded ink track up to the value, gray after it, a large white thumb with an ink outline (DESIGN.md, Settings controls). */
export function Slider({ label, value, step, disabled, onChange }: SliderProps) {
  return (
    <input
      type="range"
      min={0}
      max={100}
      step={step}
      value={value}
      disabled={disabled}
      aria-label={label}
      className="slider min-w-0 flex-1 cursor-pointer disabled:cursor-not-allowed disabled:opacity-disabled"
      style={{ "--slider-fill": `${value}%` } as CSSProperties}
      onChange={(event) => onChange(Number(event.target.value))}
    />
  );
}
