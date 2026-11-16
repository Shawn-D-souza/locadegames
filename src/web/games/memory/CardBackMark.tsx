/** In the back's 100-unit box: the question mark's baseline and size. */
const MARK = { baseline: 71, size: 58 };

/**
 * What's pressed into a card's back (owner's pick of six, without its inner frame: owner wanted only the mark): a big
 * pale question mark, "what's under here?". Drawn in the back's lighter shade on its deep indigo, so it never competes
 * with a face.
 */
export function CardBackMark() {
  return (
    <svg className="absolute inset-0 size-full" viewBox="0 0 100 100" aria-hidden="true">
      <text x={50} y={MARK.baseline} textAnchor="middle" fontSize={MARK.size} className="fill-memory-back-mark font-display font-black">
        ?
      </text>
    </svg>
  );
}
