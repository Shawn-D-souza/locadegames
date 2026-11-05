import { useEffect, useRef, useState } from "react";
import type { Arena } from "../../../shared/arena/types";
import type { OutReason } from "../../../shared/games/territory/types";
import type { Bytes } from "../../../shared/protocol/bytes";
import type { PlayerId } from "../../../shared/rooms/types";
import { Badge } from "../../components/Badge";
import { IconButton } from "../../components/IconButton";
import { useAutoContinue } from "../../hooks/useAutoContinue";
import { useCountdownSounds } from "../../hooks/useCountdownSounds";
import type { BinaryListener } from "../../hooks/useRoomConnection";
import { arenaName } from "../../utils/arenaText";
import { TERRITORY_CLIENT_CONFIG } from "./config";
import { CountdownDisc } from "./hud/CountdownDisc";
import { LandTable } from "./hud/LandTable";
import { MatchClock } from "./hud/MatchClock";
import { KillPop } from "./hud/KillPop";
import { KnockoutFeed } from "./hud/KnockoutFeed";
import { StatusCard } from "./hud/StatusCard";
import { TerritoryEnding } from "./hud/TerritoryEnding";
import { useMatchClockSounds } from "./useMatchClockSounds";
import { useTerritoryGame } from "./useTerritoryGame";

interface TerritoryScreenProps {
  arena: Arena;
  myId: PlayerId;
  clockOffsetMs: number;
  sendBinary(data: Bytes): void;
  subscribeBinary(listener: BinaryListener): () => void;
  /** Your ✕ while you are still in (the room asks first). */
  onQuit(): void;
  /** Watching without playing: back leaves the room. */
  onLeave(): void;
  /** Once the match is over and its ending has shown: on to the results. */
  onContinue(): void;
  /** Tells the room whether you are still in (the back button only asks then). */
  onStillInChange(stillIn: boolean): void;
}

/** How long "YOU'RE OUT!" stays before it gives way to watching. */
const OUT_CARD_MS = 4_000;

function outText(reason: OutReason | null, cutter: PlayerId | null, arena: Arena): string {
  if (reason === "quit") return "You quit this match.";
  if (reason === "cut" && cutter !== null) return `Cut by ${arenaName(arena, cutter)}.`;
  if (reason === "land" && cutter !== null) return `${arenaName(arena, cutter)} took all your land.`;
  return "Your land is gone.";
}

/** Territory, full screen: the arena canvas, with the clock, the land table and messages on top. */
export function TerritoryScreen({ arena, myId, clockOffsetMs, sendBinary, subscribeBinary, onQuit, onLeave, onContinue, onStillInChange }: TerritoryScreenProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const hud = useTerritoryGame(canvasRef, { arena, myId, clockOffsetMs, sendBinary, subscribeBinary });
  const playing = arena.entrants.some((e) => e.id === myId);
  const finished = arena.finished;
  const stillIn = playing && !finished && (hud?.meAlive ?? true);
  const names = new Map(arena.entrants.map((e) => [e.id, e.name]));

  useEffect(() => onStillInChange(stillIn), [stillIn, onStillInChange]);
  useAutoContinue(finished, TERRITORY_CLIENT_CONFIG.hud.endShowMs, onContinue);

  // "You're out" shows a moment, then you just watch.
  const knockedOut = playing && hud?.synced === true && !hud.meAlive && !finished;
  const [outCardDone, setOutCardDone] = useState(false);
  useEffect(() => {
    if (!knockedOut) return;
    const timer = setTimeout(() => setOutCardDone(true), OUT_CARD_MS);
    return () => clearTimeout(timer);
  }, [knockedOut]);

  const countingDown = !!hud && hud.countdownMs > 0 && !finished;
  // Keyed to what the overlay shows, so each sound lands with its number.
  useCountdownSounds(countingDown ? Math.ceil(hud.countdownMs / 1000) : 0);
  useMatchClockSounds(countingDown, hud && !finished ? Math.ceil(hud.timeLeftMs / 1000) : null);
  // Your latest knockout, celebrated over your head.
  const myKill = playing && !finished ? hud?.knockouts.filter((k) => k.by === myId && k.id !== myId).at(-1) : undefined;

  return (
    <div className="fixed inset-0 overflow-hidden bg-line select-none">
      <canvas ref={canvasRef} className="absolute inset-0 size-full touch-none" aria-label="Territory arena" />

      <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between gap-2 p-4">
        <div className="pointer-events-auto flex flex-col items-start gap-2">
          {stillIn && <IconButton icon="close" label="Quit match" onClick={onQuit} />}
          {!playing && !finished && <IconButton icon="back" label="Leave room" onClick={onLeave} />}
          {hud && !countingDown && !finished && <MatchClock msLeft={hud.timeLeftMs} />}
          {hud && !finished && <KnockoutFeed knockouts={hud.knockouts} arena={arena} myId={myId} />}
        </div>
        {/* Everyone starts level, so the table waits for play (the countdown has the space); the ending has the screen to itself. */}
        {hud && !countingDown && !finished && <LandTable shares={hud.shares} names={names} myId={myId} />}
      </div>

      {(!playing || outCardDone) && !finished && (
        // At the bottom: the top row is full on small phones, and watchers have no minimap there.
        <div className="pointer-events-none absolute inset-x-0 bottom-0 flex justify-center p-4">
          <Badge tone="ink">
            <span className="size-2 animate-live rounded-pill bg-coral" />
            {playing ? "WATCHING" : "WATCHING LIVE"}
          </Badge>
        </div>
      )}

      {countingDown && (
        // In the upper half, so your own head (the middle of the screen) stays in view.
        <div className="pointer-events-none absolute inset-x-0 top-0 flex h-1/2 items-center justify-center">
          <CountdownDisc msLeft={hud.countdownMs} />
        </div>
      )}

      {myKill && (
        <KillPop
          key={`${myKill.id}:${myKill.at}`}
          label={myKill.reason === "cut" ? `Cut ${arenaName(arena, myKill.id)}!` : `Took ${arenaName(arena, myKill.id)}'s land!`}
          colorId={myId}
        />
      )}

      {knockedOut && !outCardDone && (
        <div className="pointer-events-none absolute inset-x-0 bottom-0 flex justify-center pb-12">
          <StatusCard title="You're out!">
            <p>{outText(hud.myOutReason, hud.myCutter, arena)}</p>
            <p className="text-caption">Watch the rest of the match.</p>
          </StatusCard>
        </div>
      )}


      {/* The arena plays the ending; the tag stamps on, then the results come by themselves (no tap to skip: a stray tap would miss it). */}
      {finished && <TerritoryEnding arena={arena} myId={myId} playing={playing} />}
    </div>
  );
}
