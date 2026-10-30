import { useCallback, useState } from "react";
import { loadDefaultName, loadPlayerName, saveDefaultName, savePlayerName } from "../services/sessionStore";
import { randomName } from "../utils/randomName";

/** Reads the first-visit random name, creating and saving it only if there is none yet. */
function ensureDefaultName(): string {
  const saved = loadDefaultName();
  if (saved) return saved;
  const name = randomName();
  saveDefaultName(name);
  return name;
}

/**
 * The display name, remembered across visits. New players start with a random name;
 * `defaultName` is used whenever the field is left empty.
 */
export function usePlayerName() {
  const [defaultName] = useState(ensureDefaultName);
  const [name, setNameState] = useState(() => loadPlayerName() ?? defaultName);
  const setName = useCallback((value: string) => {
    setNameState(value);
    savePlayerName(value);
  }, []);
  return { name, setName, defaultName };
}
