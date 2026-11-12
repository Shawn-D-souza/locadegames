import type { Party } from "../../shared/party/types";
import type { PlayerId } from "../../shared/rooms/types";
import { partyName } from "../utils/partyText";
import { playerStyle } from "../utils/playerStyle";
import { Badge } from "./Badge";
import { PlaceDisc } from "./PlaceDisc";

interface PartyRankingTableProps {
  party: Party;
  myId: PlayerId;
}

/**
 * Final order of a game everyone played together: a bar per player in their color with their place (gold, silver,
 * bronze) and name. No numbers (owner decision: the place is the result; everyone but the winner ends with nothing, so
 * a count would say nothing); only a quitter is marked, `QUIT`.
 */
export function PartyRankingTable({ party, myId }: PartyRankingTableProps) {
  return (
    <ol className="flex w-full flex-col gap-3">
      {party.results.map((r) => (
        <li
          key={r.id}
          className="flex min-h-tap items-center gap-3 rounded-control border-thin border-ink bg-player pr-4 pl-3 text-player-text max-phone:gap-2 max-phone:pr-3 max-phone:pl-2"
          style={playerStyle(r.id)}
        >
          <PlaceDisc place={r.place} />
          <span className="min-w-0 flex-1 truncate max-phone:text-caption">{partyName(party, r.id)}</span>
          {r.id === myId && <Badge tone="ink">YOU</Badge>}
          {r.quit && <span className="flex-none font-display text-caption font-black">QUIT</span>}
        </li>
      ))}
    </ol>
  );
}
