/**
 * Slowly turning rays in `--player`, twice the parent's width and centered behind whatever it holds (a winning
 * board), under everything in the nearest isolated ancestor; the parent must be positioned. Appears at --celebrate-at.
 */
export function SunRays() {
  return (
    <div
      className="pointer-events-none absolute top-1/2 left-1/2 z-behind aspect-square w-[200%] -translate-1/2 animate-rays sun-rays opacity-rays"
      aria-hidden="true"
    />
  );
}
