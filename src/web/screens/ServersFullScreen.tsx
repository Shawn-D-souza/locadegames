import { Header } from "../components/Header";
import { PillButton } from "../components/PillButton";
import { ScreenLayout } from "../components/ScreenLayout";
import { TabCard } from "../components/TabCard";
import { formatResetTime } from "../utils/formatResetTime";

/** Shown instead of errors when the daily free-tier budget is nearly used up; the words sit in a card, over the dots. */
export function ServersFullScreen({ resetAt, onBack }: { resetAt: Date; onBack(): void }) {
  const time = formatResetTime(resetAt);
  return (
    <ScreenLayout
      header={<Header title="Locade Games" onBack={onBack} backLabel="Back home" />}
      centered
      footer={
        <PillButton fullWidth onClick={onBack}>
          OK!
        </PillButton>
      }
    >
      <TabCard title="Servers full!" className="items-center gap-4 bg-white text-ink">
        <span className="font-display text-numeral text-waiting text-lip-ink" aria-hidden="true">
          Zzz
        </span>
        <p className="text-center font-display text-title uppercase">Back at {time}</p>
      </TabCard>
    </ScreenLayout>
  );
}
