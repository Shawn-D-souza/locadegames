import { clsx } from "clsx";
import { useState } from "react";
import { TerritoryStage, type TerritoryMoment } from "./TerritoryStage";

const MOMENTS: TerritoryMoment[] = ["win", "lose", "watch", "kill"];

/**
 * Dev-only page (`?preview=territory`): replays Territory's big moments (your win, your loss, watching
 * someone win, your knockout of someone) on a scripted match, without a server or players.
 */
export function TerritoryPreview() {
  const [moment, setMoment] = useState<TerritoryMoment>("win");
  // A new key remounts the stage, which plays the moment again from the first frame.
  const [run, setRun] = useState(0);

  const choice = (active: boolean, label: string, onClick: () => void) => (
    <button
      type="button"
      key={label}
      className={clsx("cursor-pointer rounded-pill border-thin border-ink px-3 py-1 text-caption", active ? "bg-ink text-white" : "bg-white")}
      onClick={() => {
        onClick();
        setRun((n) => n + 1);
      }}
    >
      {label}
    </button>
  );

  return (
    <div className="fixed inset-0 overflow-hidden bg-line select-none">
      <TerritoryStage key={run} moment={moment} />
      {/* Dev tool bar: compact, not part of the game's look. */}
      <div className="absolute top-0 right-0 flex flex-col items-end gap-2 p-4">
        {MOMENTS.map((m) => choice(m === moment, m.toUpperCase(), () => setMoment(m)))}
        {choice(false, "↻ REPLAY", () => undefined)}
      </div>
    </div>
  );
}
