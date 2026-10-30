import { Header } from "../components/Header";
import { LoadingDots } from "../components/LoadingDots";
import { RoomCode } from "../components/RoomCode";
import { ScreenLayout } from "../components/ScreenLayout";
import { TabCard } from "../components/TabCard";

/** While the room connects: a JOINING ROOM card with the code and hopping dots; the back arrow gives up. */
export function JoiningScreen({ code, onBack }: { code: string; onBack(): void }) {
  return (
    <ScreenLayout header={<Header title="Locade Games" onBack={onBack} backLabel="Back home" />} centered>
      <TabCard title="Joining room" className="items-center gap-6 bg-white text-ink">
        <RoomCode code={code} />
        <span role="status" aria-label="Joining">
          <LoadingDots />
        </span>
      </TabCard>
    </ScreenLayout>
  );
}
