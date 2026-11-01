import { colors, getPlayerColor, lighten } from "../../../theme";
import { TERRITORY_CLIENT_CONFIG } from "./config";

const RED = getPlayerColor(0);
const BLUE = getPlayerColor(1);
const LIP = 4;
const OUTLINE = 2.5;

/** Land shapes in the 100×100 tile. */
const RED_LAND = "M14 30 C14 18 30 12 42 18 C52 22 54 36 46 44 C38 52 20 50 16 42 Z";
const BLUE_LAND = "M58 60 C64 52 80 52 86 62 C92 72 84 86 72 86 C60 86 52 70 58 60 Z";
/** Red's trail: out of its land, a loop toward blue, heading home. */
const RED_TRAIL = "M46 36 C60 34 70 40 68 50 C66 58 50 60 38 54";

/**
 * The game tile: a small arena with two raised lands and a trail on its way home, drawn in the app's
 * style (white floor, ink outline, player colors with a solid lip).
 */
export function TerritoryArt() {
  const trailWidth = 7;
  return (
    <svg viewBox="0 0 100 100" className="size-full" aria-hidden="true">
      <circle cx="50" cy={50 + LIP / 2} r="46" fill={colors.ink} />
      <circle cx="50" cy="50" r="46" fill={colors.white} stroke={colors.ink} strokeWidth={OUTLINE} />
      <path d={RED_LAND} fill={RED.dark} transform={`translate(0 ${LIP})`} />
      <path d={BLUE_LAND} fill={BLUE.dark} transform={`translate(0 ${LIP})`} />
      <path d={RED_LAND} fill={RED.base} />
      <path d={BLUE_LAND} fill={BLUE.base} />
      <path d={RED_TRAIL} fill="none" stroke={RED.base} strokeWidth={trailWidth} strokeLinecap="round" />
      <path
        d={RED_TRAIL}
        fill="none"
        stroke={lighten(RED.base, TERRITORY_CLIENT_CONFIG.look.trailLighten)}
        strokeWidth={trailWidth * TERRITORY_CLIENT_CONFIG.look.trailInnerShare}
        strokeLinecap="round"
      />
      <g transform="translate(38 54) rotate(160)">
        <rect x="-6" y={-6 + LIP / 2} width="12" height="12" rx="3" fill={colors.ink} />
        <rect x="-6" y="-6" width="12" height="12" rx="3" fill={RED.base} stroke={colors.ink} strokeWidth="1.5" />
        <circle cx="2" cy="-2.5" r="1.8" fill={colors.white} stroke={colors.ink} strokeWidth="0.8" />
        <circle cx="2" cy="2.5" r="1.8" fill={colors.white} stroke={colors.ink} strokeWidth="0.8" />
      </g>
    </svg>
  );
}
