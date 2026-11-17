import { MemoryScreen } from "../../../../src/web/games/memory/MemoryScreen";
import { createGame } from "../../../../src/shared/games/memory/rules";
import { partyView } from "../../../../src/shared/party/party";
import { seededRandom } from "../../../../src/shared/random";
import type { PlayerId } from "../../../../src/shared/rooms/types";
import { AppScreen } from "../../parts/AppScreen";
import { useVideoClock } from "../../clock/useVideoClock";
import { cueSeconds } from "../../timing";
import { CLIPS } from "../clips";
import { scriptParty, spacedBefore, stateAt, useClipSeconds } from "./script";

/**
 * Memory, a flash: Ana's second card turns over on the beat and makes a pair. Before it, the game so far, turn by turn
 * in turn order (Ana, Ben, Mia, Leo): P a pair found (then the same player goes again), M a miss (the turn passes).
 * Which cards are turned is picked at random; what they turn out to be is loaded, as in a playtest.
 */
// Each miss shows two pictures not seen yet, so there are few (18 pictures: 8 pairs and 4 misses use 16).
const TURNS = ["PM", "PPM", "PM", "PM", "PP"].join("");
const F = cueSeconds("flash_memory");

const random = seededRandom(5);
const cards = createGame(4, 0).cards.length;
const turned = new Set<number>();
const fresh = () => {
  const left = Array.from({ length: cards }, (_, i) => i).filter((i) => !turned.has(i));
  const card = left[Math.floor(random() * left.length)]!;
  turned.add(card);
  return card;
};
// Each turn is two cards: a new picture, then its partner (a pair) or another new one (a miss). Then Ana's first card of her next go.
const moves: { card: number; deal: "new" | "match" }[] = [];
for (const turn of TURNS) moves.push({ card: fresh(), deal: "new" }, { card: fresh(), deal: turn === "P" ? "match" : "new" });
moves.push({ card: fresh(), deal: "new" });
const LAST = { card: fresh(), deal: "match" as const };
// Misses' cards turn back face down (the board shows them as the phones see them); spaced so each has played out.
const at = spacedBefore(moves.length, F - 1.6, 2.2);
const SCRIPT = scriptParty("memory", [...moves.map((m, i) => [m, at(i)] as const), [LAST, F - 0.05]]);

export function MemoryClip() {
  useVideoClock(CLIPS.memory.from);
  const party = partyView(stateAt(useClipSeconds("memory"), SCRIPT));
  return (
    <AppScreen>
      <MemoryScreen party={party} myId={0 as PlayerId} clockOffsetMs={0} send={() => {}} lastError={null} onQuit={() => {}} onLeave={() => {}} onContinue={() => {}} />
    </AppScreen>
  );
}
