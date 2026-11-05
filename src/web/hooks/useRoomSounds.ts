import { useEffect, useRef } from "react";
import type { RoomView } from "../../shared/protocol/messages";
import type { PlayerId } from "../../shared/rooms/types";
import { playSound, prepareGameSounds } from "../services/soundPlayer";
import { roomChangeCues } from "../sound/cues/roomCues";
import type { ConnectionStatus } from "./connectionState";

/** Sounds of the room as a whole: friends coming and going, games starting, the connection, short "no" notices. */
export function useRoomSounds(room: RoomView | null, myId: PlayerId | null, status: ConnectionStatus, errorId: number | null, beforeRoundStart: boolean) {
  const game = room?.tournament?.gameId ?? room?.arena?.gameId ?? null;
  useEffect(() => {
    if (game) prepareGameSounds(game);
  }, [game]);

  const lastRoom = useRef<RoomView | null>(null);
  useEffect(() => {
    if (!room || myId === null || lastRoom.current === room) return;
    for (const cue of roomChangeCues(lastRoom.current, room, myId)) playSound(cue.sound, { variant: cue.variant });
    lastRoom.current = room;
  }, [room, myId]);

  const lastStatus = useRef(status);
  useEffect(() => {
    const was = lastStatus.current;
    lastStatus.current = status;
    if (status === "reconnecting" && was === "connected") playSound("connectionDropped");
    if (status === "connected" && (was === "reconnecting" || was === "lost")) playSound("connectionRestored");
  }, [status]);

  useEffect(() => {
    if (errorId !== null) playSound("actionRefused");
  }, [errorId]);

  // The round intro's countdown reaching zero: every match of the round opens at once.
  const wasBefore = useRef(beforeRoundStart);
  useEffect(() => {
    if (wasBefore.current && !beforeRoundStart) playSound("countdownGo");
    wasBefore.current = beforeRoundStart;
  }, [beforeRoundStart]);
}
