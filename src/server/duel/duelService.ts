import { isLiveGame } from "../../shared/games/catalog";
import { matchSeed } from "../../shared/games/headcrash/random";
import { decodeClientMessage, encodePong } from "../../shared/games/headcrash/wire";
import type { Seat } from "../../shared/games/types";
import type { PlayerId } from "../../shared/rooms/types";
import { currentRound, isLive, isLiveMatch } from "../../shared/tournament/tournament";
import type { Tournament } from "../../shared/tournament/types";
import type { RoomTransport, Ticker } from "../rooms/ports";
import { DUEL_SERVER_CONFIG } from "./config";
import { HeadCrashDuel } from "./headCrashDuel";

interface Hosted {
  duel: HeadCrashDuel;
  /** The tournament it belongs to (match ids start over in each one). */
  tournamentAt: number;
  players: [PlayerId, PlayerId];
  watchers: Set<PlayerId>;
  /** The score last reported to the room. */
  reported: string;
}

type ScoreListener = (code: string, matchId: number, score: readonly [number, number]) => void;
type FinishListener = (code: string, matchId: number, winner: Seat | null, score: readonly [number, number]) => void;

/**
 * Runs the live matches of real-time tournament games (Head Crash): a round's matches side by side, each
 * streamed only to its two players and whoever watches it. The room's record says which matches should be
 * running; `reconcile` makes it so, which also restarts a match the server lost (from its score, on a fresh round).
 * The loop only runs while a match does, so the host can sleep between games.
 */
export class DuelService {
  private readonly rooms = new Map<string, Map<number, Hosted>>();

  constructor(
    private readonly transport: RoomTransport,
    private readonly ticker: Ticker,
    private readonly now: () => number,
    private readonly onScore: ScoreListener,
    private readonly onFinished: FinishListener,
  ) {}

  has(code: string): boolean {
    return this.rooms.has(code);
  }

  /** Starts the matches the room's tournament says are live and drops every other. `tournament`: null when the room plays none. */
  reconcile(code: string, tournament: Tournament | null) {
    const wanted = tournament && !tournament.finished && isLiveGame(tournament.gameId) ? currentRound(tournament).matches.filter(isLive).filter(isLiveMatch) : [];
    const hosted = this.rooms.get(code) ?? new Map<number, Hosted>();
    for (const [id, running] of hosted) {
      if (running.tournamentAt !== tournament?.startedAt || !wanted.some((match) => match.id === id)) hosted.delete(id);
    }
    for (const match of wanted) {
      if (hosted.has(match.id)) continue;
      const { score } = match.game;
      // Step 0 is when the round starts, or now for a match picked up again.
      const duel = new HeadCrashDuel(match.id, matchSeed(tournament!.coinSeed, match.id), score, Math.max(match.turnStartedAt, this.now()));
      hosted.set(match.id, { duel, tournamentAt: tournament!.startedAt, players: match.players, watchers: new Set(), reported: score.join(":") });
    }
    if (hosted.size > 0) this.rooms.set(code, hosted);
    else this.rooms.delete(code);
    if (this.rooms.size > 0) this.ticker.start(DUEL_SERVER_CONFIG.loopIntervalMs, () => this.loop());
    else this.ticker.stop();
  }

  /**
   * A binary frame from a player or a watcher: buttons, a clock ping, or watching a match.
   * False when it was for a match of a room that runs none (the server may have lost it: check the record).
   */
  receive(code: string, id: PlayerId, data: ArrayBuffer): boolean {
    if (data.byteLength > DUEL_SERVER_CONFIG.maxBinaryBytes) return true;
    const msg = decodeClientMessage(data);
    if (!msg) return true;
    if (msg.kind === "ping") {
      this.transport.sendBinary(code, id, encodePong(msg.clientTime, this.now()));
      return true;
    }
    const hosted = this.rooms.get(code);
    if (!hosted) return false;
    const running = hosted.get(msg.matchId);
    if (!running) return true;
    if (msg.kind === "input") {
      const seat = running.players.indexOf(id);
      if (seat !== -1) running.duel.input(seat as Seat, msg.seq, msg.tick, msg.buttons);
    } else if (msg.kind === "watch") {
      running.watchers.add(id);
      this.transport.sendBinary(code, id, running.duel.snapshot());
    } else running.watchers.delete(id);
    return true;
  }

  /** Steps every match that is due and streams the snapshots; a point or a finished match is reported to the room. */
  loop() {
    const now = this.now();
    for (const [code, hosted] of this.rooms) {
      for (const [id, running] of hosted) {
        const { duel } = running;
        if (!duel.advance(now)) continue;
        this.transport.sendBinaryToMany(code, [...running.players, ...running.watchers], duel.snapshot());
        const { score } = duel.state;
        const outcome = duel.outcome;
        if (outcome) {
          // Gone before the room hears of it: its update may start the next round's matches right here.
          hosted.delete(id);
          this.onFinished(code, id, outcome.kind === "win" ? outcome.seat : null, score);
        } else if (running.reported !== score.join(":")) {
          running.reported = score.join(":");
          this.onScore(code, id, score);
        }
      }
    }
  }
}
