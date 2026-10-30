import { describe, expect, it } from "vitest";
import { parseClientMessage } from "../src/shared/protocol/parse";

describe("parseClientMessage", () => {
  it("accepts valid messages", () => {
    expect(parseClientMessage('{"type":"move","move":3}')).toEqual({ type: "move", move: 3 });
    expect(parseClientMessage('{"type":"start","gameId":"tictactoe"}')).toEqual({ type: "start", gameId: "tictactoe" });
    expect(parseClientMessage('{"type":"suggest","gameId":null}')).toEqual({ type: "suggest", gameId: null });
    expect(parseClientMessage('{"type":"timeout","matchId":2}')).toEqual({ type: "timeout", matchId: 2 });
    expect(parseClientMessage('{"type":"leave","extra":1}')).toEqual({ type: "leave" });
  });

  it("rejects malformed input", () => {
    for (const raw of [
      "",
      "nope",
      "[]",
      "null",
      '{"type":"move"}',
      '{"type":"start","gameId":"chess"}',
      '{"type":"suggest"}',
      '{"type":"timeout","matchId":"1"}',
      '{"type":"hack"}',
    ]) {
      expect(parseClientMessage(raw)).toBeNull();
    }
  });

  it("rejects oversized messages", () => {
    expect(parseClientMessage(JSON.stringify({ type: "leave", pad: "x".repeat(600) }))).toBeNull();
  });
});
