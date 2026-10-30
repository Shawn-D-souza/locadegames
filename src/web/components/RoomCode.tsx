import { formatRoomCode } from "../../shared/rooms/roomCode";

/** The room code, big in an outlined box: `482 913`. */
export function RoomCode({ code }: { code: string }) {
  return (
    <span
      className="flex min-h-tap w-full items-center justify-center rounded-control border-outline border-ink bg-white text-code tracking-code text-ink"
      aria-label={`Room code ${formatRoomCode(code)}`}
    >
      {formatRoomCode(code)}
    </span>
  );
}
