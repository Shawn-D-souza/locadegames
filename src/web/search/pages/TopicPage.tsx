import { SectionCard } from "../../components/SectionCard";
import { BodyText } from "../components/BodyText";
import { ComparisonTable } from "../components/ComparisonTable";
import { ContentCard } from "../components/ContentCard";
import { FaqList } from "../components/FaqList";
import { GameLinkGrid } from "../components/GameLinkGrid";
import { PageHero } from "../components/PageHero";
import { PlayLink } from "../components/PlayLink";
import { AllGamesLink } from "../components/AllGamesLink";
import { SEARCH_TEXT } from "../content/sharedCopy";
import type { TopicPageCopy } from "../types";

/** A page for a search that isn't one game: its sections (paragraphs, a comparison, games), questions, then PLAY NOW. */
export function TopicPage({ copy }: { copy: TopicPageCopy }) {
  return (
    <>
      <PageHero heading={copy.heading} intro={copy.intro} />
      {copy.sections.map((section) => (
        <ContentCard key={section.heading} heading={section.heading}>
          {section.paragraphs.map((paragraph) => (
            <BodyText key={paragraph}>{paragraph}</BodyText>
          ))}
          {section.table && <ComparisonTable rows={section.table} />}
          {section.games && <GameLinkGrid games={section.games} />}
        </ContentCard>
      ))}
      <SectionCard label={SEARCH_TEXT.questions}>
        <FaqList faq={copy.faq} />
      </SectionCard>
      <PlayLink />
      <AllGamesLink />
    </>
  );
}
