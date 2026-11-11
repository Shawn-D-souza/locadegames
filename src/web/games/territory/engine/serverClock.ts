import { TERRITORY_CONFIG } from "../../../../shared/games/territory/config";
import { ServerClock } from "../../../netcode/serverClock";
import { TERRITORY_CLIENT_CONFIG } from "../config";

/** The server's clock (the shared one) and Territory's step counter on it. */
export class TerritoryClock extends ServerClock {
  constructor(
    initialOffset: number,
    public tickZeroAt: number,
  ) {
    super(initialOffset, TERRITORY_CLIENT_CONFIG.net);
  }

  /** A pong, which also says when step 0 was (it moves if the server ever stalls). */
  addTickPong(sentAt: number, serverTime: number, receivedAt: number, tickZeroAt: number) {
    this.addPong(sentAt, serverTime, receivedAt);
    this.tickZeroAt = tickZeroAt;
  }

  /** Fractional server step at a server time. */
  tickAt(serverTime: number): number {
    return (serverTime - this.tickZeroAt) / TERRITORY_CONFIG.tickMs;
  }

  /** Server time a step happens at. */
  timeOfTick(tick: number): number {
    return this.tickZeroAt + tick * TERRITORY_CONFIG.tickMs;
  }
}
