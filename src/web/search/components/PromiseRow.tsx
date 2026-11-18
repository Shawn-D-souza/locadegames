import { PROMISE } from "../content/sharedCopy";

/** "Free · No app · No sign-up · iPhone + Android": small outlined pills under a page's heading. */
export function PromiseRow() {
  return (
    <ul className="flex flex-wrap justify-center gap-2">
      {PROMISE.map((item) => (
        <li key={item} className="rounded-pill border-thin border-ink bg-white px-3 py-1 text-caption tracking-caption uppercase">
          {item}
        </li>
      ))}
    </ul>
  );
}
