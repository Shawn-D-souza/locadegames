import { PoolScreen } from "../../../src/web/games/pool/PoolScreen";
import { startParty } from "../../../src/shared/party/party";
import type { Party } from "../../../src/shared/party/types";
import type { PlayerId } from "../../../src/shared/rooms/types";
import { AppScreen } from "../parts/AppScreen";
import { FRIENDS } from "../cast";

/** Pool, Ana to break, as the real game screen shows it (on a phone or a screen held sideways). */
export function PoolTabletScreen() {
  const party = startParty("pool", FRIENDS.map((name, id) => ({ id: id as PlayerId, name, firsts: 0 })), Date.now(), 1) as Party<"pool">;
  const ordered = { ...party, entrants: [...party.entrants].sort((a, b) => a.id - b.id) } as Party<"pool">;
  return (
    <AppScreen>
      <PoolScreen party={ordered} myId={0 as PlayerId} clockOffsetMs={0} send={() => {}} onQuit={() => {}} onLeave={() => {}} onContinue={() => {}} />
    </AppScreen>
  );
}
