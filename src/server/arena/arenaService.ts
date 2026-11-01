import type { Arena, ArenaResult } from "../../shared/arena/types";
import { decodeClientMessage, encodePong } from "../../shared/games/territory/wire";
import type { PlayerId } from "../../shared/rooms/types";
import type { RoomTransport, Ticker } from "../rooms/ports";
import { ARENA_SERVER_CONFIG } from "./config";
import { TerritoryMatch } from "./territoryMatch";

/**
 * Runs every live real-time match of this server in one loop (one region object hosts many rooms).
 * The loop only runs while a match does, so the object can sleep between games.
 */
export class ArenaService {
  private readonly matches = new Map<string, TerritoryMatch>();

  constructor(
    private readonly transport: RoomTransport,
    private readonly ticker: Ticker,
    private readonly now: () => number,
    private readonly onFinished: (code: string, results: ArenaResult[]) => void,
  ) {}

  has(code: string): boolean {
    return this.matches.has(code);
  }

  start(code: string, arena: Arena) {
    const match = new TerritoryMatch(
      arena.entrants.map((e) => e.id),
      arena.radius,
      arena.startsAt,
    );
    this.matches.set(code, match);
    this.transport.broadcastBinary(code, match.fullSync());
    this.ticker.start(ARENA_SERVER_CONFIG.loopIntervalMs, () => this.loop());
  }

  stop(code: string) {
    this.matches.delete(code);
    if (this.matches.size === 0) this.ticker.stop();
  }

  quit(code: string, id: PlayerId) {
    this.matches.get(code)?.quit(id);
  }

  sendSync(code: string, id: PlayerId) {
    const match = this.matches.get(code);
    if (match) this.transport.sendBinary(code, id, match.fullSync());
  }

  /** A binary frame from a player (or someone watching): steering, clock ping, or a sync request. */
  receive(code: string, id: PlayerId, data: ArrayBuffer) {
    const match = this.matches.get(code);
    if (!match || data.byteLength > ARENA_SERVER_CONFIG.maxBinaryBytes) return;
    const msg = decodeClientMessage(data);
    if (!msg) return;
    if (msg.kind === "input") match.input(id, msg.seq, msg.tick, msg.target);
    else if (msg.kind === "ping") this.transport.sendBinary(code, id, encodePong(msg.clientTime, this.now(), match.tickZeroAt));
    else this.transport.sendBinary(code, id, match.fullSync());
  }

  /** Steps every match that is due and streams the snapshots; finished matches report their results. */
  loop() {
    const now = this.now();
    for (const [code, match] of this.matches) {
      for (const snapshot of match.advance(now)) this.transport.broadcastBinary(code, snapshot);
      if (match.ended) {
        this.stop(code);
        this.onFinished(code, match.results());
      }
    }
  }
}
