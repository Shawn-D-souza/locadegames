interface DriveArrowProps {
  direction: "left" | "right";
  className?: string;
}

/**
 * The drive buttons' arrow: a solid triangle with soft corners, like a game pad's (a filled shape reads at a
 * glance under a thumb; an outlined arrow looked like clip art). Centered on its weight, not its box, so it
 * sits in the middle of the round button. Takes the text color.
 */
export function DriveArrow({ direction, className }: DriveArrowProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path
        d="M15 5 L6 12 L15 19 Z"
        transform={direction === "right" ? "matrix(-1 0 0 1 24 0)" : undefined}
        fill="currentColor"
        stroke="currentColor"
        strokeWidth={4}
        strokeLinejoin="round"
      />
    </svg>
  );
}
