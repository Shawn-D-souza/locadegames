import { clsx } from "clsx";
import type { CSSProperties, ReactNode } from "react";

interface ScreenLayoutProps {
  header?: ReactNode;
  footer?: ReactNode;
  centered?: boolean;
  /** Plain background in this player's light wash instead of the dot grid (match screen); eases between turns. */
  wash?: CSSProperties;
  /** A tap anywhere on the screen (skipping a finished match's wait). */
  onTap?: () => void;
  /** A wider content column (a board of small boards beside the seat cards in landscape), or the whole screen's width (Pool's table). */
  wide?: boolean | "full";
  children: ReactNode;
}

/** Page frame: optional header, a centered content column, and a thumb-reach footer for the main CTA. */
export function ScreenLayout({ header, footer, centered, wash, onTap, wide = false, children }: ScreenLayoutProps) {
  return (
    <div
      className={clsx("flex min-h-dvh flex-col overflow-clip", wash && "bg-player-wash transition-colors duration-slow ease-out")}
      style={wash}
      onClick={onTap}
    >
      {header}
      <main
        className={clsx("mx-auto flex w-full flex-1 flex-col items-center gap-6 p-gutter", wide === "full" ? "max-w-none" : wide ? "max-w-content-wide" : "max-w-content", centered && "justify-center")}
      >
        {children}
      </main>
      {footer && <footer className="mx-auto w-full max-w-content px-gutter pb-gutter">{footer}</footer>}
    </div>
  );
}
