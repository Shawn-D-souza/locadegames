/** 3, 2, 1 before play starts in a real-time game: a big numeral on a white disc (each new number pops). */
export function CountdownDisc({ count }: { count: number }) {
  return (
    <div className="flex size-countdown items-center justify-center rounded-pill border-thin border-ink bg-white">
      <span key={count} className="animate-pop-in font-display text-numeral font-black text-ink">
        {count}
      </span>
    </div>
  );
}
