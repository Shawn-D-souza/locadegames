import clsx from "clsx";
import { useState } from "react";
import { Slider } from "../../components/Slider";
import { changedText, DEFAULTS, formatKnob, knobId, KNOBS, readKnob, resetTuning, saveTuning, writeKnob, type Knob } from "./tuning";

/** The slider's 0 … 100 in this many steps. */
const SLIDER_STEP = 0.5;
const BUTTON_CLASSES = "cursor-pointer rounded-pill border-thin border-ink bg-white px-3 py-1 text-caption";

const percentOf = (knob: Knob, value: number) => ((value - knob.min) / (knob.max - knob.min)) * 100;
const valueAt = (knob: Knob, percent: number) => Number((knob.min + (percent / 100) * (knob.max - knob.min)).toFixed(knob.decimals));

/**
 * Dev-only (`?preview=headcrash`): a slider for every number of the driving's feel, changing the game as it plays.
 * Kept in this browser; the changed values show at the bottom, to copy and send. Open, it is a column beside the
 * game (so it never covers a car); TUNE opens and closes it.
 */
export function TuningPanel() {
  const [open, setOpen] = useState(true);
  const [values, setValues] = useState(() => Object.fromEntries(KNOBS.map((k) => [knobId(k), readKnob(k)])));
  const [copied, setCopied] = useState(false);

  const set = (knob: Knob, value: number) => {
    writeKnob(knob, value);
    saveTuning();
    setValues((old) => ({ ...old, [knobId(knob)]: value }));
    setCopied(false);
  };
  const reset = () => {
    resetTuning();
    setValues({ ...DEFAULTS });
  };
  const changed = changedText();
  const copy = () => void navigator.clipboard?.writeText(changed).then(() => setCopied(true));

  return (
    <div className={clsx("flex flex-col items-start gap-2 p-2", open ? "h-full flex-none" : "absolute top-0 left-0 z-devTool")}>
      <button type="button" className={BUTTON_CLASSES} onClick={() => setOpen((o) => !o)}>
        {open ? "HIDE TUNER" : "TUNE"}
      </button>
      {open && (
        <div className="flex min-h-0 w-dev-panel flex-col gap-3 overflow-y-auto rounded-card border-thin border-ink bg-white p-3">
          {KNOBS.map((knob) => {
            const value = values[knobId(knob)]!;
            const moved = value !== DEFAULTS[knobId(knob)];
            return (
              <div key={knobId(knob)} className="flex flex-col gap-1">
                <div className="flex items-baseline justify-between gap-2 text-caption">
                  <span className="font-bold text-ink">{knob.label}</span>
                  <button
                    type="button"
                    className={moved ? "cursor-pointer font-bold text-coral" : "text-ink"}
                    title={moved ? `Back to ${formatKnob(knob, DEFAULTS[knobId(knob)]!)}` : undefined}
                    onClick={() => moved && set(knob, DEFAULTS[knobId(knob)]!)}
                  >
                    {formatKnob(knob, value)}
                  </button>
                </div>
                <Slider label={knob.label} value={percentOf(knob, value)} step={SLIDER_STEP} onChange={(p) => set(knob, valueAt(knob, p))} />
                <span className="text-caption text-ink-muted">{knob.help}</span>
              </div>
            );
          })}
          <pre className="rounded-card bg-background p-2 text-caption whitespace-pre-wrap text-ink select-text">{changed}</pre>
          <div className="flex gap-2">
            <button type="button" className={BUTTON_CLASSES} onClick={copy}>
              {copied ? "COPIED" : "COPY CHANGES"}
            </button>
            <button type="button" className={BUTTON_CLASSES} onClick={reset}>
              RESET ALL
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
