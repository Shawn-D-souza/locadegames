import { renderSound } from "./definition";
import { soundDefinition, type SoundName } from "./soundBook";

/** Making sounds takes real work on a phone, so it happens here, away from the game's frames. */

export interface RenderRequest {
  name: SoundName;
  variant: number;
}

export interface RenderResult extends RenderRequest {
  left: Float32Array;
  right: Float32Array;
}

const worker = self as unknown as { onmessage: ((event: MessageEvent<RenderRequest>) => void) | null; postMessage(message: RenderResult, transfer: Transferable[]): void };

worker.onmessage = ({ data }) => {
  const [left, right] = renderSound(data.name, soundDefinition(data.name), data.variant);
  worker.postMessage({ ...data, left, right }, [left.buffer as ArrayBuffer, right.buffer as ArrayBuffer]);
};
