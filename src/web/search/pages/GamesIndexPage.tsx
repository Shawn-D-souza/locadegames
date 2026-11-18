import { GAMES, type GameId } from "../../../shared/games/catalog";
import { SectionCard } from "../../components/SectionCard";
import { GameLinkGrid } from "../components/GameLinkGrid";
import { PageHero } from "../components/PageHero";
import { StepList } from "../components/StepList";
import { howToSteps, SEARCH_TEXT } from "../content/sharedCopy";
import { GAMES_INDEX_COPY } from "../content/topicCopy";

/** Games everyone plays together, then the 1 v 1 games, each group in the catalog's order. */
const TOGETHER: readonly GameId[] = GAMES.filter((game) => game.format !== "tournament").map((game) => game.id);
const VERSUS: readonly GameId[] = GAMES.filter((game) => game.format === "tournament").map((game) => game.id);

/** Every game, each linking to its page. */
export function GamesIndexPage() {
  return (
    <>
      <PageHero heading={GAMES_INDEX_COPY.heading} intro={GAMES_INDEX_COPY.intro} />
      <SectionCard label={GAMES_INDEX_COPY.groups.together}>
        <GameLinkGrid games={TOGETHER} />
      </SectionCard>
      <SectionCard label={GAMES_INDEX_COPY.groups.versus}>
        <GameLinkGrid games={VERSUS} />
      </SectionCard>
      <SectionCard label={SEARCH_TEXT.howTo}>
        <StepList steps={howToSteps()} />
      </SectionCard>
    </>
  );
}
