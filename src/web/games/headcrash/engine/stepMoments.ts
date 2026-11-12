import type { StepReport } from "../../../../shared/games/headcrash/physics";
import type { Seat } from "../../../../shared/games/types";
import type { MomentView } from "./frame";

const SEATS: readonly Seat[] = [0, 1];

/** The report every step fills in (one per player of the match, reused). */
export const emptyReport = (): StepReport => ({
  grounded: [false, false],
  impact: [0, 0],
  carsTouched: false,
  knock: [0, 0],
  padThrow: [false, false],
  inFan: [false, false],
});

/**
 * Turns each step's report into moments (landings, knocks, pads, fans, bumps): what changed since the step before, so
 * a pad touched for a few steps or a fan stayed in is one moment. Only steps played for the first time go in, so a
 * replay stays quiet.
 */
export class StepMoments {
  /** Each car has a wheel on the ground (as of the last step noted). */
  readonly grounded: [boolean, boolean] = [true, true];
  private readonly airTicks: [number, number] = [0, 0];
  private readonly thrown: [boolean, boolean] = [false, false];
  private readonly inFan: [boolean, boolean] = [false, false];

  /** A step outside play (countdown, a hit's pause): nothing happened, and the next round starts afresh. */
  rest() {
    for (const seat of SEATS) {
      this.airTicks[seat] = 0;
      this.thrown[seat] = this.inFan[seat] = false;
    }
  }

  /** A step of play, just played: what happened in it goes into `out`. */
  note(report: StepReport, now: number, out: MomentView[]) {
    const { grounded, impact, carsTouched, knock, padThrow, inFan } = report;
    for (const seat of SEATS) {
      if (grounded[seat] && !this.grounded[seat]) out.push({ kind: "land", seat, impact: impact[seat], airTicks: this.airTicks[seat], at: now });
      else if (knock[seat] > 0) out.push({ kind: "knock", seat, impact: knock[seat], at: now });
      if (padThrow[seat] && !this.thrown[seat]) out.push({ kind: "pad", seat, at: now });
      if (inFan[seat] && !this.inFan[seat]) out.push({ kind: "fan", seat, at: now });
      this.grounded[seat] = grounded[seat];
      this.airTicks[seat] = grounded[seat] ? 0 : this.airTicks[seat] + 1;
      this.thrown[seat] = padThrow[seat];
      this.inFan[seat] = inFan[seat];
    }
    if (carsTouched) out.push({ kind: "bump", impact: Math.max(impact[0], impact[1]), at: now });
  }
}
