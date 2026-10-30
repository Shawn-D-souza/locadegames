import { clsx } from "clsx";
import type { InputHTMLAttributes } from "react";

interface TextFieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "onChange"> {
  label: string;
  onChange(value: string): void;
  variant?: "text" | "code";
  /** Keeps the label for screen readers only, when the field speaks for itself. */
  hideLabel?: boolean;
}

export function TextField({ label, onChange, variant = "text", hideLabel, className, ...rest }: TextFieldProps) {
  return (
    <label className="flex w-full flex-col gap-2">
      <span className={hideLabel ? "sr-only" : "text-caption text-ink"}>{label}</span>
      <input
        className={clsx(
          // Focus thickens the outline inward without shifting the layout.
          "min-h-tap rounded-control border-thin border-ink bg-white px-4 text-ink outline-none placeholder:text-ink-soft",
          "transition-shadow duration-fast ease-out focus:shadow-focus",
          variant === "code" ? "text-center text-code tracking-code" : "text-label",
          className,
        )}
        onChange={(event) => onChange(event.target.value)}
        {...rest}
      />
    </label>
  );
}
