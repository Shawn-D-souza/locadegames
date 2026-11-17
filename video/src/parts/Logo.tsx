import type { ReactNode } from "react";

/**
 * The app's logo (src/web/public/logo.svg) drawn piece by piece: an X, an O, a pawn and a die, each with its own solid
 * ink lip, so each can pop on alone. The lip's filter covers the whole logo (a piece's own box leaves out its thick
 * outline, which clipped the lip). `pop` is each piece's size (0: not there yet; a spring may overshoot 1).
 */
const PIECES: { center: [number, number]; shape: ReactNode }[] = [
  {
    center: [146, 142],
    shape: (
      <g transform="translate(146 142)" fill="none" strokeLinecap="round">
        <path d="M-52 -52 L52 52 M52 -52 L-52 52" stroke="#312C85" strokeWidth="64" />
        <path d="M-52 -52 L52 52 M52 -52 L-52 52" stroke="#D7263D" strokeWidth="36" />
      </g>
    ),
  },
  {
    center: [366, 142],
    shape: (
      <g transform="translate(366 142)" fill="none">
        <circle r="54" stroke="#312C85" strokeWidth="64" />
        <circle r="54" stroke="#00BFEF" strokeWidth="36" />
      </g>
    ),
  },
  {
    center: [146, 360],
    shape: (
      <g transform="translate(146 370)" fill="#78C840" stroke="#312C85" strokeWidth="16" strokeLinejoin="round">
        <path d="M-26 -40 C-26 -10 -58 26 -62 64 H62 C58 26 26 -10 26 -40 Z" />
        <circle cy="-72" r="40" />
        <rect x="-80" y="60" width="160" height="40" rx="16" />
      </g>
    ),
  },
  {
    center: [366, 352],
    shape: (
      <g transform="translate(366 352) rotate(8)">
        <rect x="-84" y="-84" width="168" height="168" rx="40" fill="#FFFFFF" stroke="#312C85" strokeWidth="16" />
        <g fill="#312C85">
          <circle cx="-40" cy="-40" r="17" />
          <circle r="17" />
          <circle cx="40" cy="40" r="17" />
        </g>
      </g>
    ),
  },
];

export function Logo({ size, pop = [1, 1, 1, 1] }: { size: number; pop?: readonly number[] }) {
  return (
    <svg viewBox="0 0 512 512" width={size} height={size} style={{ overflow: "visible", display: "block" }}>
      <defs>
        <filter id="logo-lip" filterUnits="userSpaceOnUse" x="-100" y="-100" width="712" height="712">
          <feOffset in="SourceAlpha" dy="16" result="shape" />
          <feFlood floodColor="#312C85" />
          <feComposite in2="shape" operator="in" />
        </filter>
      </defs>
      <g transform="translate(13 7) scale(0.95)">
        {PIECES.map((piece, i) => {
          const k = pop[i] ?? 1;
          if (k <= 0) return null;
          const [cx, cy] = piece.center;
          // Each piece grows from its own middle with a little twist, alternating which way.
          const twist = (1 - Math.min(1, k)) * (i % 2 ? 18 : -18);
          return (
            <g key={i} transform={`translate(${cx} ${cy}) scale(${k}) rotate(${twist}) translate(${-cx} ${-cy})`}>
              <g filter="url(#logo-lip)">{piece.shape}</g>
              {piece.shape}
            </g>
          );
        })}
      </g>
    </svg>
  );
}
