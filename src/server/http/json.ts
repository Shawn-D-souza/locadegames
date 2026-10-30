import type { HttpError } from "../../shared/protocol/errors";
import type { HttpErrorResponse } from "../../shared/protocol/messages";

export function json(body: unknown, status: number, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...headers },
  });
}

export function jsonError(
  error: HttpError,
  status: number,
  headers: Record<string, string> = {},
  extra: Partial<HttpErrorResponse> = {},
): Response {
  return json({ error, ...extra } satisfies HttpErrorResponse, status, headers);
}
