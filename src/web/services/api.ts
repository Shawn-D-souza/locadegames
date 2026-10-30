import type { HttpError } from "../../shared/protocol/errors";
import type { CreateRoomResponse, HttpErrorResponse } from "../../shared/protocol/messages";
import { nextUtcMidnight } from "../../shared/time/nextUtcMidnight";
import { CLIENT_CONFIG } from "../config";

export type CreateRoomOutcome =
  | { kind: "created"; code: string }
  | { kind: "full"; resetAt: Date }
  | { kind: "error"; error: HttpError | "OFFLINE" };

/** Creates a private room. Sent with no body so the browser skips the CORS preflight request. */
export async function createRoom(): Promise<CreateRoomOutcome> {
  let response: Response;
  try {
    response = await fetch(`${CLIENT_CONFIG.serverUrl}/api/rooms`, { method: "POST" });
  } catch {
    // Over the hard daily limit Cloudflare answers without CORS headers, so fetch just fails.
    if (navigator.onLine) return { kind: "full", resetAt: nextUtcMidnight(new Date()) };
    return { kind: "error", error: "OFFLINE" };
  }
  const body = (await response.json().catch(() => null)) as Partial<CreateRoomResponse & HttpErrorResponse> | null;
  if (response.ok && body?.code) return { kind: "created", code: body.code };
  if (body?.error === "SERVERS_FULL" && body.resetAt) return { kind: "full", resetAt: new Date(body.resetAt) };
  return { kind: "error", error: body?.error ?? "INTERNAL" };
}
