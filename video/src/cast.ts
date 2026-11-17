import type { PlayerView, RoomView } from "../../src/shared/protocol/messages";
import type { PlayerId } from "../../src/shared/rooms/types";

/** The four friends, in join order (so in the app's player colors: red, blue, green, yellow). */
export const FRIENDS = ["Ana", "Ben", "Mia", "Leo"] as const;
export const ROOM_CODE = "482913";
/** Zoe: a fifth friend, out of town, who only turns up in the chat at the end (in the fifth player color). */
export const ZOE = 4;
/** Everyone in the group chat. */
export const CHAT_NAMES = [...FRIENDS, "Zoe"] as const;

export function roomWith(count: number, suggestions: Partial<Record<number, PlayerView["suggestion"]>> = {}): RoomView {
  return {
    code: ROOM_CODE,
    phase: "lobby",
    hostId: 0 as PlayerId,
    players: FRIENDS.slice(0, count).map((name, id) => ({ id: id as PlayerId, name, connected: true, trophies: 0, suggestion: suggestions[id] ?? null })),
    tournament: null,
    arena: null,
    party: null,
    serverNow: 0,
  };
}
