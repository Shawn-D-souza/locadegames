import { useEffect } from "react";
import { Header } from "../components/Header";
import { Icon } from "../components/Icon";
import { PillButton } from "../components/PillButton";
import { ScreenLayout } from "../components/ScreenLayout";
import { TabCard } from "../components/TabCard";
import { playSound } from "../services/soundPlayer";

/** Something stopped you (no such room, room full, ...): the message in a card, so it reads well over the dots. */
export function ErrorScreen({ message, onBack }: { message: string; onBack(): void }) {
  useEffect(() => {
    playSound("errorScreen");
  }, []);
  return (
    <ScreenLayout
      header={<Header title="Locade Games" onBack={onBack} backLabel="Back home" />}
      centered
      footer={
        <PillButton fullWidth onClick={onBack}>
          HOME
        </PillButton>
      }
    >
      <TabCard title="Oops!!" className="items-center gap-4 bg-white text-ink">
        <Icon name="sad" className="size-avatar stroke-coral" />
        <p className="text-center">{message}</p>
      </TabCard>
    </ScreenLayout>
  );
}
