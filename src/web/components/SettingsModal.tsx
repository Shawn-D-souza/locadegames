import { useSyncExternalStore } from "react";
import { isSoundOn, playSound, setSoundOn, subscribeSoundOn } from "../services/soundPlayer";
import { Modal } from "./Modal";
import { PillButton } from "./PillButton";
import { Toggle } from "./Toggle";

/** Settings we plan to offer; none work yet, so each row says so. */
const PLANNED_SETTINGS = ["Music", "Haptics"] as const;

const ROW_CLASSES = "flex min-h-tap items-center justify-between gap-4 border-dashed border-line text-left not-last:border-b-dash";

function setSoundEffects(on: boolean) {
  // Turning sound off still answers once, so you hear it took: the sound goes first, the setting after.
  if (!on) playSound("switchOff");
  setSoundOn(on);
  if (on) playSound("switchOn");
}

/** The settings menu: sound effects work; what's still to come says so. */
export function SettingsModal({ onClose }: { onClose(): void }) {
  const soundOn = useSyncExternalStore(subscribeSoundOn, isSoundOn);
  return (
    <Modal
      title="Settings"
      onDismiss={onClose}
      actions={
        <PillButton variant="deep" fullWidth sound="popupClose" onClick={onClose}>
          CLOSE
        </PillButton>
      }
    >
      <ul className="flex w-full flex-col">
        <li className={ROW_CLASSES}>
          <span className="text-ink">Sound effects</span>
          <Toggle label="Sound effects" on={soundOn} onChange={setSoundEffects} />
        </li>
        {PLANNED_SETTINGS.map((setting) => (
          <li key={setting} className={`${ROW_CLASSES} text-ink-muted`}>
            <span>{setting}</span>
            <span className="text-caption tracking-caption text-subtle">COMING SOON</span>
          </li>
        ))}
      </ul>
    </Modal>
  );
}
