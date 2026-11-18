import { getGame, type GameId } from "../../../shared/games/catalog";
import { SectionCard } from "../../components/SectionCard";
import { AllGamesLink } from "../components/AllGamesLink";
import { BodyText } from "../components/BodyText";
import { FaqList } from "../components/FaqList";
import { GameLinkGrid } from "../components/GameLinkGrid";
import { PageHero } from "../components/PageHero";
import { PlayLink } from "../components/PlayLink";
import { RuleList } from "../components/RuleList";
import { StepList } from "../components/StepList";
import { GAME_COPY } from "../content/gameCopy";
import { howToSteps, SEARCH_TEXT } from "../content/sharedCopy";
import { playersText } from "../playersText";

/** One game's page: what it is, how to start it with friends, its rules, questions, then more games. */
export function GamePage({ id }: { id: GameId }) {
  const copy = GAME_COPY[id];
  const game = getGame(id);
  return (
    <>
      <PageHero heading={copy.heading} intro={copy.intro} art={{ id, alt: `${game.name} on Locade` }} />
      <SectionCard label={SEARCH_TEXT.howTo}>
        <StepList steps={howToSteps(game.name)} />
        <BodyText>{playersText(game)}</BodyText>
      </SectionCard>
      <SectionCard label={SEARCH_TEXT.rules}>
        <RuleList rules={copy.rules} />
      </SectionCard>
      <SectionCard label={SEARCH_TEXT.questions}>
        <FaqList faq={copy.faq} />
      </SectionCard>
      <PlayLink />
      <SectionCard label={SEARCH_TEXT.moreGames}>
        <GameLinkGrid games={copy.related} />
        <AllGamesLink />
      </SectionCard>
    </>
  );
}
