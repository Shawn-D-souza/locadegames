import { clsx } from "clsx";
import type { CSSProperties, ReactNode } from "react";

interface TabCardProps {
  /** The headline, in an ink tab on the card's top edge. */
  title: string;
  /** Pops in a moment after the screen opens (the results' champion card). */
  reveal?: boolean;
  /** Layout and colors of the card itself (white with ink text when left out). */
  className?: string;
  style?: CSSProperties;
  children: ReactNode;
}

/** An outlined card with its headline as an ink tab on the top edge: the champion, an error, servers full. */
export function TabCard({ title, reveal, className, style, children }: TabCardProps) {
  return (
    <div className={clsx("w-full pt-6", reveal && "animate-reveal")}>
      <section className={clsx("relative flex w-full flex-col rounded-card border-thin border-ink p-card pt-12", className ?? "bg-white text-ink")} style={style}>
        <h2 className="absolute top-0 left-1/2 -translate-1/2 rounded-pill border-thin border-ink bg-ink px-4 py-2 font-display text-title font-black whitespace-nowrap text-white uppercase">
          {title}
        </h2>
        {children}
      </section>
    </div>
  );
}
