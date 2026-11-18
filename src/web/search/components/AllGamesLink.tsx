import { SEARCH_TEXT } from "../content/sharedCopy";
import { GAMES_INDEX_PATH } from "../paths";

/** An ink button to the page listing every game. */
export function AllGamesLink() {
  return (
    <a
      href={GAMES_INDEX_PATH}
      className="inline-flex min-h-tap w-full items-center justify-center rounded-control border-thin border-ink bg-ink px-6 text-button tracking-button text-white uppercase shadow-lip-medium transition-[translate,box-shadow] duration-fast ease-spring active:translate-y-lip-medium active:shadow-pressed"
    >
      {SEARCH_TEXT.allGames}
    </a>
  );
}
