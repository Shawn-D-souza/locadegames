import { useEffect, useRef, useState, type FormEvent } from "react";
import { FORMATTED_CODE_LENGTH, formatRoomCode, isValidRoomCode, normalizeRoomCode } from "../../shared/rooms/roomCode";
import { sanitizePlayerName } from "../../shared/rooms/playerName";
import { ROOM_CONFIG } from "../../shared/rooms/config";
import { Divider } from "../components/Divider";
import { NameField } from "../components/NameField";
import { PillButton } from "../components/PillButton";
import { ScreenLayout } from "../components/ScreenLayout";
import { TextField } from "../components/TextField";
import { usePlayerName } from "../hooks/usePlayerName";
import { playSound } from "../services/soundPlayer";

interface HomeScreenProps {
  initialCode: string;
  busy: boolean;
  onCreate(name: string): void;
  onJoin(name: string, code: string): void;
}

/** Platform home: your name, then create a room or join one. Games are picked inside the room. */
export function HomeScreen({ initialCode, busy, onCreate, onJoin }: HomeScreenProps) {
  const { name, setName, defaultName } = usePlayerName();
  const [code, setCode] = useState(initialCode);
  // An empty field plays as the first-visit random name.
  const playName = sanitizePlayerName(name) ?? defaultName;
  const cleanCode = normalizeRoomCode(code);
  // The last digit going in: JOIN ROOM wakes up.
  const codeComplete = isValidRoomCode(cleanCode);
  const wasComplete = useRef(codeComplete);
  useEffect(() => {
    if (codeComplete && !wasComplete.current) playSound("roomCodeComplete");
    wasComplete.current = codeComplete;
  }, [codeComplete]);

  const join = (event: FormEvent) => {
    event.preventDefault();
    if (isValidRoomCode(cleanCode)) onJoin(playName, cleanCode);
  };

  return (
    <ScreenLayout centered>
      <h1 className="text-center font-display text-display font-black tracking-display uppercase">Locade Games</h1>

      <div className="flex w-full flex-col gap-6 rounded-card border-thin border-ink bg-white p-card">
        <NameField value={name} fallback={defaultName} maxLength={ROOM_CONFIG.nameMaxLength} onChange={setName} />
        <PillButton fullWidth disabled={busy} onClick={() => onCreate(playName)}>
          {busy ? "CREATING..." : "CREATE ROOM"}
        </PillButton>
        <Divider label="OR" />
        <form className="flex w-full flex-col gap-4" onSubmit={join}>
          <TextField
            label="Room code"
            hideLabel
            variant="code"
            value={formatRoomCode(cleanCode)}
            onChange={setCode}
            maxLength={FORMATTED_CODE_LENGTH}
            placeholder={formatRoomCode("0".repeat(ROOM_CONFIG.codeLength))}
            inputMode="numeric"
            autoComplete="off"
            spellCheck={false}
          />
          <PillButton type="submit" variant="deep" fullWidth disabled={!isValidRoomCode(cleanCode) || busy}>
            JOIN ROOM
          </PillButton>
        </form>
      </div>
    </ScreenLayout>
  );
}
