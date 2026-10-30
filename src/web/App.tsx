import { useCallback, useState } from "react";
import { sanitizePlayerName } from "../shared/rooms/playerName";
import { isValidRoomCode, normalizeRoomCode } from "../shared/rooms/roomCode";
import { ErrorScreen } from "./screens/ErrorScreen";
import { HomeScreen } from "./screens/HomeScreen";
import { RoomScreen } from "./screens/RoomScreen";
import { ServersFullScreen } from "./screens/ServersFullScreen";
import { createRoom } from "./services/api";
import { loadDefaultName, loadPlayerName, loadRoomToken } from "./services/sessionStore";
import { httpErrorMessage } from "./utils/messages";
import { readRoomFromUrl, setRoomInUrl } from "./utils/roomUrl";

type View =
  | { screen: "home" }
  | { screen: "room"; code: string; name: string }
  | { screen: "full"; resetAt: Date }
  | { screen: "error"; message: string };

/** A refresh inside a room rejoins the same seat; a shared link opens with the code filled in. */
function initialView(urlCode: string): View {
  const name = sanitizePlayerName(loadPlayerName() ?? "") ?? loadDefaultName();
  if (isValidRoomCode(urlCode) && loadRoomToken(urlCode) && name) return { screen: "room", code: urlCode, name };
  return { screen: "home" };
}

export function App() {
  const [urlCode] = useState(() => normalizeRoomCode(readRoomFromUrl() ?? ""));
  const [view, setView] = useState<View>(() => initialView(urlCode));
  const [busy, setBusy] = useState(false);

  const enterRoom = useCallback((code: string, name: string) => {
    setRoomInUrl(code);
    setView({ screen: "room", code, name });
  }, []);

  const goHome = useCallback((message?: string) => {
    setRoomInUrl(null);
    setView(message ? { screen: "error", message } : { screen: "home" });
  }, []);

  const handleCreate = async (name: string) => {
    setBusy(true);
    const outcome = await createRoom();
    setBusy(false);
    if (outcome.kind === "created") enterRoom(outcome.code, name);
    else if (outcome.kind === "full") setView({ screen: "full", resetAt: outcome.resetAt });
    else setView({ screen: "error", message: httpErrorMessage(outcome.error) });
  };

  switch (view.screen) {
    case "home":
      return (
        <HomeScreen
          initialCode={urlCode}
          busy={busy}
          onCreate={handleCreate}
          onJoin={(name, code) => enterRoom(code, name)}
        />
      );
    case "room":
      return <RoomScreen key={view.code} code={view.code} name={view.name} onExit={goHome} />;
    case "full":
      return <ServersFullScreen resetAt={view.resetAt} onBack={() => goHome()} />;
    case "error":
      return <ErrorScreen message={view.message} onBack={() => goHome()} />;
  }
}
