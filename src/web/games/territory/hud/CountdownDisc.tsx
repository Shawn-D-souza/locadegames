/** 3, 2, 1 before play starts: a big numeral on a white disc in the middle (each new second pops). */
export function CountdownDisc({ msLeft }: { msLeft: number }) {
  const seconds = Math.ceil(msLeft / 1000);
  return (
    <div className="flex size-countdown items-center justify-center rounded-pill border-thin border-ink bg-white shadow-lip-medium">
      <span key={seconds} className="animate-pop-in font-display text-numeral font-black text-ink">
        {seconds}
      </span>
    </div>
  );
}
