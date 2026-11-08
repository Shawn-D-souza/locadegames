import type { ArenaResult } from "../../shared/arena/types";
import { formatClock } from "../utils/arenaText";
import { ShareNumber } from "./ShareNumber";

/** What a real-time result shows, in the games' number font: the land share if still in at the end, else how long they lasted (`OUT` / `QUIT` small). */
export function ArenaResultValue({ result: r }: { result: ArenaResult }) {
  if (r.survivedMs === null) return <ShareNumber share={r.landShare} size="large" />;
  return (
    <span className="flex flex-none items-baseline gap-1 font-display font-black whitespace-nowrap tabular-nums">
      <span className="text-caption">{r.quit ? "QUIT" : "OUT"}</span>
      <span className="text-title">{formatClock(r.survivedMs)}</span>
    </span>
  );
}
