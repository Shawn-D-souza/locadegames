import { AbsoluteFill, Easing, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { Logo } from "../parts/Logo";
import { colors, fonts } from "../look";
import { cue, seconds, type CueName } from "../timing";

/**
 * The end of the video (0:46–0:53): the logo builds big in the middle, a piece a beat (X, O, pawn, die, each on its
 * note); then it moves aside for LOCADE GAMES, and the end card fills in under them as in style frame 5: Free · In
 * your browser · No download, and where to play. Frames count from the X's cue.
 */

const START = cue("logoX");
const at = (name: CueName) => cue(name) - START;
const PIECES: CueName[] = ["logoX", "logoO", "logoPawn", "logoDie"];
const POP = { damping: 10, stiffness: 190, mass: 0.6 };

/** The logo while it builds, then in its place on the end card beside the name (scene px). */
const BIG = { size: 520, x: 960, y: 520 };
const ROW_Y = 410;
const SMALL = { size: 290, x: 640, y: ROW_Y };
const NAME_LEFT = 830;
/** The line under the name comes a bar after it; the address on the end cue. */
const TAGLINE = at("logoName") + seconds(1);

export function Act4Logo() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const pop = (from: number, config = POP) => spring({ frame: frame - from, fps, config });

  const move = Easing.inOut(Easing.cubic)(interpolate(frame, [at("logoName") - seconds(0.1), at("logoName") + seconds(0.3)], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }));
  const size = BIG.size + (SMALL.size - BIG.size) * move;
  const x = BIG.x + (SMALL.x - BIG.x) * move;
  const y = BIG.y + (SMALL.y - BIG.y) * move;

  const name = pop(at("logoName") + 2, { damping: 12, stiffness: 200, mass: 0.7 });
  const tagline = pop(TAGLINE, { damping: 13, stiffness: 210, mass: 0.6 });
  const address = pop(at("end"), { damping: 11, stiffness: 200, mass: 0.7 });

  return (
    <AbsoluteFill>
      <div style={{ position: "absolute", left: x - size / 2, top: y - size / 2 }}>
        <Logo size={size} pop={PIECES.map((p) => pop(at(p)))} />
      </div>
      {name > 0.001 && (
        <div
          style={{
            position: "absolute",
            left: NAME_LEFT,
            top: ROW_Y,
            transform: `translateY(-50%) scale(${name}) rotate(${(1 - name) * -5}deg)`,
            transformOrigin: "left center",
            background: colors.white,
            border: `4px solid ${colors.ink}`,
            borderRadius: 40,
            padding: "26px 52px",
            fontFamily: fonts.display,
            fontWeight: 800,
            fontSize: 150,
            lineHeight: 0.95,
            color: colors.ink,
            textTransform: "uppercase",
            whiteSpace: "nowrap",
          }}
        >
          Locade
          <br />
          Games
        </div>
      )}
      <div style={{ position: "absolute", left: 0, right: 0, top: 690, display: "flex", flexDirection: "column", alignItems: "center", gap: 40 }}>
        <div
          style={{
            transform: `scale(${tagline})`,
            background: colors.white,
            border: `3px solid ${colors.ink}`,
            borderRadius: 999,
            padding: "12px 34px",
            fontFamily: fonts.body,
            fontWeight: 700,
            fontSize: 34,
            letterSpacing: "0.08em",
            color: colors.ink,
            textTransform: "uppercase",
          }}
        >
          Free · In your browser · No download
        </div>
        <div
          style={{
            transform: `scale(${address}) rotate(${(1 - address) * 4}deg)`,
            background: colors.coral,
            color: colors.white,
            border: `4px solid ${colors.ink}`,
            borderRadius: 28,
            boxShadow: `0 10px 0 ${colors.ink}`,
            padding: "20px 56px",
            fontFamily: fonts.body,
            fontWeight: 700,
            fontSize: 56,
            letterSpacing: "0.04em",
          }}
        >
          locadegames.pages.dev
        </div>
      </div>
    </AbsoluteFill>
  );
}
