import { clsx } from "clsx";
import { useState } from "react";
import { getPlayerColor, playerColors } from "../../theme";
import { CELEBRATION_STYLES, type CelebrationStyleId } from "./celebrationStyles";
import { CelebrationStage, type Outcome } from "./CelebrationStage";

const STYLE_IDS = Object.keys(CELEBRATION_STYLES) as CelebrationStyleId[];
const OUTCOMES: Outcome[] = ["win", "lose", "draw"];

/** Dev-only page (`?preview=celebrations`): replays each celebration style so the owner can compare them on a phone. */
export function CelebrationPreview() {
  const [styleId, setStyleId] = useState<CelebrationStyleId>("c");
  const [outcome, setOutcome] = useState<Outcome>("win");
  const [colorId, setColorId] = useState(0);
  // A new key remounts the stage, which plays the celebration again from the first frame.
  const [run, setRun] = useState(0);
  const replay = () => setRun((n) => n + 1);

  const choice = (active: boolean, label: string, onClick: () => void) => (
    <button
      type="button"
      key={label}
      className={clsx("cursor-pointer rounded-pill border-thin border-ink px-3 py-1 text-caption", active ? "bg-ink text-white" : "bg-white")}
      onClick={() => {
        onClick();
        replay();
      }}
    >
      {label}
    </button>
  );

  // Dev tool bar: compact, not part of the game's look.
  const controls = (
    <div className="flex flex-col gap-2 border-b-thin border-ink bg-white px-gutter py-3">
      <div className="flex flex-wrap gap-2">{STYLE_IDS.map((id) => choice(id === styleId, CELEBRATION_STYLES[id].name, () => setStyleId(id)))}</div>
      <div className="flex flex-wrap gap-2">
        {OUTCOMES.map((o) => choice(o === outcome, o.toUpperCase(), () => setOutcome(o)))}
        {choice(false, "↻ REPLAY", () => undefined)}
      </div>
      <div className="flex flex-wrap gap-2">
        {playerColors.map((_, id) => (
          <button
            type="button"
            key={id}
            aria-label={`Player color ${id + 1}`}
            className={clsx("size-8 cursor-pointer rounded-pill border-thin border-ink", id === colorId && "shadow-selected")}
            style={{ backgroundColor: getPlayerColor(id).base }}
            onClick={() => {
              setColorId(id);
              replay();
            }}
          />
        ))}
      </div>
    </div>
  );

  return <CelebrationStage key={run} look={CELEBRATION_STYLES[styleId]} outcome={outcome} colorId={colorId} controls={controls} />;
}
