import type { RoomStore } from "../../src/server/rooms/ports";
import type { RoomRecord } from "../../src/server/rooms/roomRecord";

/** In-memory RoomStore, the same shape a Node.js host could use. */
export class MemoryRoomStore implements RoomStore {
  readonly rooms = new Map<string, RoomRecord>();

  get(code: string) {
    return this.rooms.get(code) ?? null;
  }
  put(record: RoomRecord) {
    this.rooms.set(record.code, structuredClone(record));
  }
  delete(code: string) {
    this.rooms.delete(code);
  }
  deleteStale(createdBefore: number, emptyBefore: number) {
    for (const [code, r] of this.rooms) {
      if (r.createdAt < createdBefore || (r.emptySince !== null && r.emptySince < emptyBefore)) this.rooms.delete(code);
    }
  }
}
