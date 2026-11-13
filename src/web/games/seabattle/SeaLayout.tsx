import type { ReactNode } from "react";

interface SeaLayoutProps {
  /** The one line above the board. */
  status: string;
  big: ReactNode;
  /** The dock and the buttons: under the board, or a column beside it in landscape. */
  side: ReactNode;
}

/**
 * Placing your fleet, sized so nothing scrolls: the board as wide as the screen allows and no taller than its height
 * leaves (less the chips, the status line, the dock and buttons under it), on phones, sideways phones and laptops alike.
 */
export function SeaLayout({ status, big, side }: SeaLayoutProps) {
  return (
    <div className="flex flex-col gap-6 landscape:flex-row landscape:items-start landscape:justify-center">
      <div className="flex min-w-0 flex-col gap-4">
        <p className="min-h-lh text-center font-display text-label font-black uppercase" aria-live="polite">
          {status}
        </p>
        {/* In landscape it also leaves the content column room for the wider dock beside it. */}
        <div className="mx-auto w-[min(100%,calc(100dvh-var(--layout-sea-reserve-placing)))] landscape:w-[min(var(--layout-board-wide),calc(100dvh-var(--layout-sea-reserve-wide)),calc(var(--layout-content-wide)-2*var(--layout-gutter)-var(--layout-sea-side-placing)-var(--space-6)))]">
          {big}
        </div>
      </div>
      {/* A sideways phone has no height to spare: the dock and buttons start level with the status line, closer together. */}
      <div className="flex flex-col items-stretch gap-6 landscape:h-auto landscape:w-sea-side-placing landscape:flex-none landscape:pt-[calc(1lh+var(--space-4))] sideways:w-sea-side sideways:gap-3 sideways:pt-0">
        {side}
      </div>
    </div>
  );
}
