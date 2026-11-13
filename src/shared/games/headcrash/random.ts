import { mixSeed } from "../../random";

export { mixSeed, seededRandom } from "../../random";

/** The seed of one match of a tournament: from the tournament's own random number and the match's id. */
export const matchSeed = (coinSeed: number, matchId: number) => mixSeed(coinSeed, matchId);
