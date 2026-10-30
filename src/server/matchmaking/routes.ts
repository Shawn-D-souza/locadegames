import { CLOSE_CODES } from "../../shared/protocol/errors";
import type { CreateRoomResponse } from "../../shared/protocol/messages";
import { generateRoomCode, isValidRoomCode, normalizeRoomCode, regionPrefixOf } from "../../shared/rooms/roomCode";
import { REGION_CONFIG, REGION_PREFIXES } from "../config";
import type { Env } from "../env";
import { json, jsonError } from "../http/json";
import { rejectSocket } from "../http/rejectSocket";
import { getCapacity } from "./capacity";
import { claimRoomCode } from "./claimRoomCode";
import { randomIndex } from "./randomIndex";
import { pickRegion, regionForPrefix, regionServerStub } from "./region";

/** POST /api/rooms: start a new private room in the caller's nearest region. Games are picked inside the room. */
export async function handleCreateRoom(request: Request, env: Env, headers: Record<string, string>): Promise<Response> {
  const capacity = await getCapacity(env.USAGE, Date.now());
  if (!capacity.open) return jsonError("SERVERS_FULL", 503, headers, { resetAt: capacity.resetAt });

  const region = pickRegion(request.cf as { continent?: string; longitude?: string } | undefined);
  const stub = regionServerStub(env.REGION_SERVER, region);
  const code = await claimRoomCode(
    () => generateRoomCode(REGION_PREFIXES[region], randomIndex),
    (candidate) => stub.createRoom(candidate),
    REGION_CONFIG.maxCodeAttempts,
  );
  if (!code) return jsonError("INTERNAL", 500, headers);
  return json({ code } satisfies CreateRoomResponse, 201, headers);
}

/** GET /api/rooms/:code/ws: forward the WebSocket upgrade to the room's region server. */
export async function handleRoomSocket(request: Request, env: Env, rawCode: string): Promise<Response> {
  if (request.headers.get("Upgrade") !== "websocket") return jsonError("UPGRADE_REQUIRED", 426);
  const code = normalizeRoomCode(rawCode);
  const region = isValidRoomCode(code) ? regionForPrefix(regionPrefixOf(code)) : null;
  if (!region) return rejectSocket(CLOSE_CODES.roomNotFound, "Room not found");
  return regionServerStub(env.REGION_SERVER, region).fetch(request);
}
