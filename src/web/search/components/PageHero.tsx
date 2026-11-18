import type { GameId } from "../../../shared/games/catalog";
import { ArtImage } from "./ArtImage";
import { BodyText } from "./BodyText";
import { PlayLink } from "./PlayLink";
import { PromiseRow } from "./PromiseRow";

interface PageHeroProps {
  heading: string;
  intro: readonly string[];
  /** On a game's page: the game, for its art, and the art's description. */
  art?: { id: GameId; alt: string };
}

/** The top card of a page: the game's art, the one heading, what the page is about, the promise and PLAY NOW. */
export function PageHero({ heading, intro, art }: PageHeroProps) {
  return (
    <section className="flex w-full flex-col items-center gap-4 rounded-card border-thin border-ink bg-white p-card text-center">
      {art && (
        <div className="aspect-square w-1/2">
          <ArtImage id={art.id} alt={art.alt} />
        </div>
      )}
      <h1 className="font-display text-title font-black uppercase">{heading}</h1>
      <PromiseRow />
      <div className="flex flex-col gap-3 text-left">
        {intro.map((paragraph) => (
          <BodyText key={paragraph}>{paragraph}</BodyText>
        ))}
      </div>
      <PlayLink />
    </section>
  );
}
