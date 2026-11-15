import { clsx } from "clsx";
import type { CSSProperties } from "react";
import { hapticTarget, playHaptic } from "../../services/hapticPlayer";

/** The diamond around a line, so the nearest line to a finger is the one it takes. */
const DIAMOND = "[clip-path:polygon(50%_0,100%_50%,50%_100%,0_50%)]";

/** The line as it would be drawn, inside the diamond, along its middle. */
const PREVIEW_CLASSES = {
  horizontal: "inset-x-[8%] top-[44%] bottom-[44%]",
  vertical: "inset-y-[8%] right-[44%] left-[44%]",
} as const;

interface LineTargetProps {
  horizontal: boolean;
  /** Where its diamond sits (`targetStyle`), with your colors for the preview. */
  style: CSSProperties;
  /** Your turn: it takes taps. */
  enabled: boolean;
  label: string;
  onDraw(): void;
}

/**
 * The tap area of one open line: a diamond centred on it (made of the halves of the boxes beside it nearest to it),
 * so the line nearest your finger is the one you draw. Hovering with a mouse shows the line in your light color;
 * pressing shows it in your color (slide off to take it back).
 */
export function LineTarget({ horizontal, style, enabled, label, onDraw }: LineTargetProps) {
  const where = PREVIEW_CLASSES[horizontal ? "horizontal" : "vertical"];
  return (
    <button
      ref={hapticTarget}
      type="button"
      className={clsx("group absolute outline-none", DIAMOND, enabled && "cursor-pointer")}
      style={style}
      disabled={!enabled}
      aria-label={label}
      onClick={() => {
        // Felt the moment the finger lands; its sound waits until the server has accepted it.
        playHaptic("dotsBoxesTap");
        onDraw();
      }}
    >
      <span className={clsx("pointer-events-none invisible absolute rounded-pill bg-player-light group-enabled:group-hover:visible", where)} />
      <span className={clsx("pointer-events-none invisible absolute rounded-pill bg-player group-enabled:group-focus-visible:visible group-enabled:group-active:visible", where)} />
    </button>
  );
}
