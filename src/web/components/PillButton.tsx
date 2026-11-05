import { clsx } from "clsx";
import type { ButtonHTMLAttributes } from "react";
import { playSound } from "../services/soundPlayer";
import type { SoundName } from "../sound/soundBook";
import { Icon, type IconName } from "./Icon";

interface PillButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "deep" | "share";
  icon?: IconName;
  fullWidth?: boolean;
  /** Its press, if not the usual one for its variant. */
  sound?: SoundName;
}

const VARIANT_CLASSES = { primary: "bg-coral", deep: "bg-ink", share: "bg-grass-green" } as const;
const VARIANT_SOUNDS = { primary: "mainButtonPress", deep: "secondButtonPress", share: "mainButtonPress" } as const;

/** Rounded-rectangle action button: flat fill, thin ink outline, solid ink lip (DESIGN.md §5). Disabled looks flat and muted, not see-through. */
export function PillButton({ variant = "primary", icon, fullWidth, sound, className, children, onClick, ...rest }: PillButtonProps) {
  return (
    <button
      type="button"
      className={clsx(
        "inline-flex min-h-tap items-center justify-center gap-3 rounded-control border-thin border-ink px-6 text-button tracking-button text-white uppercase",
        "shadow-lip-medium transition-[translate,box-shadow] duration-fast ease-spring enabled:cursor-pointer enabled:active:translate-y-lip-medium enabled:active:shadow-pressed",
        "disabled:cursor-not-allowed disabled:border-ink-muted disabled:bg-ink-muted disabled:shadow-none",
        VARIANT_CLASSES[variant],
        fullWidth && "w-full",
        className,
      )}
      onClick={(event) => {
        playSound(sound ?? VARIANT_SOUNDS[variant]);
        onClick?.(event);
      }}
      {...rest}
    >
      {icon && <Icon name={icon} className="size-(--type-button-size)" />}
      {children}
    </button>
  );
}
