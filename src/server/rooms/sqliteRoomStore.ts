import type { RoomStore } from "./ports";
import type { RoomRecord } from "./roomRecord";

/** RoomStore on a Durable Object's SQLite storage. One row per room. */
export class SqliteRoomStore implements RoomStore {
  constructor(private readonly sql: SqlStorage) {
    sql.exec(`CREATE TABLE IF NOT EXISTS rooms (
      code TEXT PRIMARY KEY,
      state TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      empty_since INTEGER
    )`);
  }

  get(code: string): RoomRecord | null {
    const row = this.sql.exec<{ state: string }>("SELECT state FROM rooms WHERE code = ?", code).toArray()[0];
    return row ? (JSON.parse(row.state) as RoomRecord) : null;
  }

  put(record: RoomRecord): void {
    this.sql.exec(
      `INSERT INTO rooms (code, state, created_at, empty_since) VALUES (?, ?, ?, ?)
       ON CONFLICT(code) DO UPDATE SET state = excluded.state, empty_since = excluded.empty_since`,
      record.code,
      JSON.stringify(record),
      record.createdAt,
      record.emptySince,
    );
  }

  delete(code: string): void {
    this.sql.exec("DELETE FROM rooms WHERE code = ?", code);
  }

  deleteStale(createdBefore: number, emptyBefore: number): void {
    this.sql.exec("DELETE FROM rooms WHERE created_at < ? OR empty_since < ?", createdBefore, emptyBefore);
  }
}
