import type { Env } from "./env";
import { corsHeaders, isOriginAllowed } from "./http/origins";
import { jsonError } from "./http/json";
import { matchRoomSocketPath, ROUTES } from "./http/paths";
import { handleCreateRoom, handleRoomSocket } from "./matchmaking/routes";
import { checkUsage } from "./usage/checkUsage";

export { RegionServer } from "./rooms/RegionServer";

/** Matchmaking Worker: private-room routes + the free-tier usage cron. */
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const origin = request.headers.get("Origin");
    // "*" here only so a misconfigured client can read why it was refused.
    if (!isOriginAllowed(origin, env.ALLOWED_ORIGINS)) return jsonError("BAD_ORIGIN", 403, { "Access-Control-Allow-Origin": "*" });
    const cors = corsHeaders(origin!);

    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
    if (url.pathname === ROUTES.createRoom && request.method === "POST") return handleCreateRoom(request, env, cors);

    const code = matchRoomSocketPath(url.pathname);
    if (code !== null && request.method === "GET") return handleRoomSocket(request, env, code);

    return jsonError("NOT_FOUND", 404, cors);
  },

  async scheduled(controller, env, ctx) {
    ctx.waitUntil(checkUsage(env, new Date(controller.scheduledTime)));
  },
} satisfies ExportedHandler<Env>;
