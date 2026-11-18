import { SEARCH_TEXT } from "../content/sharedCopy";

/** The page's one coral action, styled like the app's main button: a link to the home screen, where rooms are made. */
export function PlayLink() {
  return (
    <a
      href="/"
      className="inline-flex min-h-tap w-full items-center justify-center rounded-control border-thin border-ink bg-coral px-6 text-button tracking-button text-white uppercase shadow-lip-medium transition-[translate,box-shadow] duration-fast ease-spring active:translate-y-lip-medium active:shadow-pressed"
    >
      {SEARCH_TEXT.play}
    </a>
  );
}
