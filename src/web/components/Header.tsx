import { useState } from "react";
import { IconButton } from "./IconButton";
import { SettingsModal } from "./SettingsModal";

interface HeaderProps {
  /** Left out, only the two buttons show (watching a match). */
  title?: string;
  onBack?: () => void;
  backLabel?: string;
}

/** Back button, screen title and the settings gear, sitting on the dotted background. */
export function Header({ title, onBack, backLabel = "Back" }: HeaderProps) {
  const [settingsOpen, setSettingsOpen] = useState(false);
  return (
    <header className="mx-auto flex w-full max-w-content items-center gap-2 px-gutter pt-4">
      {/* Without a back button an empty slot keeps the title centered. */}
      {onBack ? <IconButton icon="back" label={backLabel} onClick={onBack} /> : <span className="w-icon-button shrink-0" />}
      {title ? (
        <h1 className="min-w-0 flex-1 truncate text-center font-display text-title-fit font-black text-ink uppercase">{title}</h1>
      ) : (
        <span className="flex-1" />
      )}
      <IconButton icon="settings" label="Settings" onClick={() => setSettingsOpen(true)} />
      {settingsOpen && <SettingsModal onClose={() => setSettingsOpen(false)} />}
    </header>
  );
}
