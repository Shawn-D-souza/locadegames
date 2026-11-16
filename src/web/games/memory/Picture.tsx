import { clsx } from "clsx";
import type { PictureId } from "../../../shared/games/memory/pictures";
import { PICTURE_ART, type Layer, type Paint } from "./pictureArt";

/** Outline and ink lines, in the pictures' 100-unit box (the chess pieces' weights). */
const LINE = 4;
const MARK = 2.5;

const FILL_CLASSES: Record<Paint, string> = {
  player: "fill-player",
  light: "fill-player-light",
  dark: "fill-player-dark",
  white: "fill-white",
  ink: "fill-ink",
  shaft: "fill-pool-cue-shaft",
};

const STROKE_CLASSES: Record<Paint, string> = {
  player: "stroke-player",
  light: "stroke-player-light",
  dark: "stroke-player-dark",
  white: "stroke-white",
  ink: "stroke-ink",
  shaft: "stroke-pool-cue-shaft",
};

function LayerShape({ layer, scale }: { layer: Layer; scale: number }) {
  const line = LINE / scale;
  switch (layer.kind) {
    case "fill":
      return <path d={layer.d} transform={layer.transform} className={clsx(FILL_CLASSES[layer.paint], "stroke-ink")} strokeWidth={line} strokeLinejoin="round" />;
    case "flat":
      return <path d={layer.d} transform={layer.transform} className={FILL_CLASSES[layer.paint]} />;
    case "stroke":
      return (
        <g transform={layer.transform} className="fill-none" strokeLinecap="round" strokeLinejoin="round">
          <path d={layer.d} className="stroke-ink" strokeWidth={layer.width + 2 * line} />
          <path d={layer.d} className={STROKE_CLASSES[layer.paint]} strokeWidth={layer.width} />
        </g>
      );
    case "ink":
      return <path d={layer.d} transform={layer.transform} className="fill-none stroke-ink" strokeWidth={MARK / scale} strokeLinecap="round" />;
  }
}

/** A card's picture, in its color (`--player` and its shades, set by the card). */
export function Picture({ picture, className }: { picture: PictureId; className?: string }) {
  const art = PICTURE_ART[picture];
  return (
    <svg className={clsx("block", className)} viewBox="0 0 100 100" aria-hidden="true">
      {art.layers.map((layer, i) => (
        <LayerShape key={i} layer={layer} scale={art.scale ?? 1} />
      ))}
    </svg>
  );
}
