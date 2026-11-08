import { clsx } from "clsx";
import { GoldCrown } from "./GoldCrown";

const MEDAL_CLASSES: Record<number, string> = { 1: "bg-gold", 2: "bg-silver", 3: "bg-bronze" };

/** A place on a results table, on a disc: gold (with a small crown), silver, bronze, then white; "–" for none. */
export function PlaceDisc({ place }: { place: number | null }) {
  return (
    <span
      className={clsx(
        "relative inline-flex size-avatar-small flex-none items-center justify-center rounded-pill border-thin border-ink font-display font-black text-ink",
        (place !== null && MEDAL_CLASSES[place]) || "bg-white",
      )}
    >
      {place === 1 && <GoldCrown className="absolute bottom-full left-1/2 w-crown-small -translate-x-1/2 translate-y-1/2" />}
      {place ?? "–"}
    </span>
  );
}
