import type { ReactNode } from "react";
import { SEARCH_TEXT } from "../content/sharedCopy";
import { SITE } from "../site";
import type { NavLink } from "../types";
import { FooterLinks } from "./FooterLinks";

interface SearchFrameProps {
  /** Links in the footer: every page made for search, so each can be reached from the others. */
  pages: readonly NavLink[];
  games: readonly NavLink[];
  /** A small line at the very bottom (not affiliated). */
  note?: string;
  children: ReactNode;
}

/** A page made for search: the logo and name (to the home screen), its cards in the app's column, and a footer of links. */
export function SearchFrame({ pages, games, note, children }: SearchFrameProps) {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="mx-auto flex w-full max-w-content items-center px-gutter pt-4">
        <a href="/" className="flex items-center gap-3" aria-label={SEARCH_TEXT.home}>
          <img src="/logo.svg" alt="" className="size-icon-button" />
          <span className="font-display text-title font-black uppercase">{SITE.name}</span>
        </a>
      </header>
      <main className="mx-auto flex w-full max-w-content flex-1 flex-col items-center gap-6 p-gutter">{children}</main>
      <footer className="mx-auto flex w-full max-w-content flex-col gap-4 px-gutter pb-8">
        <nav className="flex flex-col gap-4 rounded-card border-thin border-ink bg-white p-card">
          <FooterLinks label={SEARCH_TEXT.footerPages} links={pages} />
          <FooterLinks label={SEARCH_TEXT.footerGames} links={games} />
        </nav>
        {note && <p className="rounded-control bg-white p-3 text-caption font-medium tracking-caption text-section-label">{note}</p>}
      </footer>
    </div>
  );
}

