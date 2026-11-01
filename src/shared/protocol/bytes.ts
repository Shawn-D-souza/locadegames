/** Little-endian binary writer/reader with zigzag varints, for small real-time messages. */

/** An encoded message, backed by a plain ArrayBuffer (what WebSocket.send accepts). */
export type Bytes = Uint8Array<ArrayBuffer>;

export class ByteWriter {
  private buffer: ArrayBuffer;
  private view: DataView;
  private offset = 0;

  constructor(initialSize = 256) {
    this.buffer = new ArrayBuffer(initialSize);
    this.view = new DataView(this.buffer);
  }

  private reserve(bytes: number) {
    if (this.offset + bytes <= this.buffer.byteLength) return;
    let size = this.buffer.byteLength * 2;
    while (size < this.offset + bytes) size *= 2;
    const next = new ArrayBuffer(size);
    new Uint8Array(next).set(new Uint8Array(this.buffer, 0, this.offset));
    this.buffer = next;
    this.view = new DataView(next);
  }

  u8(value: number): this {
    this.reserve(1);
    this.view.setUint8(this.offset, value);
    this.offset += 1;
    return this;
  }

  u16(value: number): this {
    this.reserve(2);
    this.view.setUint16(this.offset, value, true);
    this.offset += 2;
    return this;
  }

  u32(value: number): this {
    this.reserve(4);
    this.view.setUint32(this.offset, value, true);
    this.offset += 4;
    return this;
  }

  i32(value: number): this {
    this.reserve(4);
    this.view.setInt32(this.offset, value, true);
    this.offset += 4;
    return this;
  }

  f64(value: number): this {
    this.reserve(8);
    this.view.setFloat64(this.offset, value, true);
    this.offset += 8;
    return this;
  }

  /** Unsigned varint (7 bits per byte), for counts. */
  varuint(value: number): this {
    let v = value;
    while (v >= 0x80) {
      this.u8((v % 0x80) | 0x80);
      v = Math.floor(v / 0x80);
    }
    return this.u8(v);
  }

  /** Signed varint (zigzag), for coordinate deltas. */
  varint(value: number): this {
    return this.varuint(value < 0 ? -2 * value - 1 : 2 * value);
  }

  bytes(): Bytes {
    return new Uint8Array(this.buffer, 0, this.offset);
  }
}

/** Reads what ByteWriter wrote; throws RangeError on a short or broken message. */
export class ByteReader {
  private readonly view: DataView;
  private offset = 0;

  constructor(data: ArrayBuffer | Uint8Array) {
    this.view = data instanceof Uint8Array ? new DataView(data.buffer, data.byteOffset, data.byteLength) : new DataView(data);
  }

  get done(): boolean {
    return this.offset >= this.view.byteLength;
  }

  u8(): number {
    const v = this.view.getUint8(this.offset);
    this.offset += 1;
    return v;
  }

  u16(): number {
    const v = this.view.getUint16(this.offset, true);
    this.offset += 2;
    return v;
  }

  u32(): number {
    const v = this.view.getUint32(this.offset, true);
    this.offset += 4;
    return v;
  }

  i32(): number {
    const v = this.view.getInt32(this.offset, true);
    this.offset += 4;
    return v;
  }

  f64(): number {
    const v = this.view.getFloat64(this.offset, true);
    this.offset += 8;
    return v;
  }

  varuint(): number {
    let result = 0;
    let scale = 1;
    for (let i = 0; i < 8; i++) {
      const byte = this.u8();
      result += (byte & 0x7f) * scale;
      if (byte < 0x80) return result;
      scale *= 0x80;
    }
    throw new RangeError("varint too long");
  }

  varint(): number {
    const v = this.varuint();
    return v % 2 === 0 ? v / 2 : -(v + 1) / 2;
  }
}
