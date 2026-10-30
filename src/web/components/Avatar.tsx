import { clsx } from "clsx";
import { playerStyle } from "../utils/playerStyle";

interface AvatarProps {
  name: string;
  /** Player id; picks the color. */
  colorIndex: number;
  small?: boolean;
}

/** Player-colored circle with the name's first letter. */
export function Avatar({ name, colorIndex, small }: AvatarProps) {
  return (
    <span
      className={clsx(
        "inline-flex flex-none items-center justify-center rounded-pill border-player-dark bg-player font-display text-white uppercase",
        small ? "size-avatar-small border-thin text-caption" : "size-avatar border-outline text-label",
      )}
      style={playerStyle(colorIndex)}
      aria-hidden="true"
    >
      {[...name][0] ?? "?"}
    </span>
  );
}
