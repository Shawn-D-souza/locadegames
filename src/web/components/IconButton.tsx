import { clsx } from "clsx";
import { Icon, type IconName } from "./Icon";

interface IconButtonProps {
  icon: IconName;
  label: string;
  onClick(): void;
  /** Stretch to fill the row (room code actions) instead of a square. */
  wide?: boolean;
}

/** Outlined icon-only button with an ink lip; the label is for screen readers. */
export function IconButton({ icon, label, onClick, wide }: IconButtonProps) {
  return (
    <button
      type="button"
      className={clsx(
        "inline-flex h-icon-button shrink-0 cursor-pointer items-center justify-center rounded-control border-thin border-ink text-ink",
        "shadow-lip-small transition-[translate,box-shadow] duration-fast ease-spring active:translate-y-lip-small active:shadow-pressed",
        wide ? "flex-1 bg-background" : "w-icon-button bg-white",
      )}
      aria-label={label}
      title={label}
      onClick={onClick}
    >
      <Icon name={icon} className="size-icon" />
    </button>
  );
}
