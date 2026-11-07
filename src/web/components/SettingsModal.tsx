import { clsx } from "clsx";
import { useSyncExternalStore } from "react";
import { hapticsAvailable, isHapticsOn, setHapticsOn, subscribeHapticsOn } from "../services/hapticPlayer";
import { getSoundVolume, isSoundOn, playSound, setSoundOn, setSoundVolume, subscribeSoundOn, subscribeSoundVolume } from "../services/soundPlayer";
import { VOLUME_STEP } from "../sound/volume";
import { Modal } from "./Modal";
import { PillButton } from "./PillButton";
import { Slider } from "./Slider";
import { Toggle } from "./Toggle";

const ROW_CLASSES = "flex min-h-tap items-center justify-between gap-4 border-dashed border-line text-left not-last:border-b-dash";

function setSoundEffects(on: boolean) {
  // Turning sound off still answers once, so you hear it took: the sound goes first, the setting after.
  if (!on) playSound("switchOff");
  setSoundOn(on);
  if (on) playSound("switchOn");
}

function setHaptics(on: boolean) {
  // The same for haptics: you feel it took.
  if (!on) playSound("switchOff");
  setHapticsOn(on);
  if (on) playSound("switchOn");
}

function changeVolume(volume: number) {
  // Every step ticks at its new volume, so you hear how loud it is as you drag: the setting goes first, the sound after.
  setSoundVolume(volume);
  playSound("volumeStep");
}

/** The settings menu: sound effects, their volume, and haptics (on phones that have them). */
export function SettingsModal({ onClose }: { onClose(): void }) {
  const soundOn = useSyncExternalStore(subscribeSoundOn, isSoundOn);
  const volume = useSyncExternalStore(subscribeSoundVolume, getSoundVolume);
  const hapticsOn = useSyncExternalStore(subscribeHapticsOn, isHapticsOn);
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
        <li className={clsx(ROW_CLASSES, soundOn ? "text-ink" : "text-ink-muted")}>
          <span>Volume</span>
          <Slider label="Volume" value={volume} step={VOLUME_STEP} disabled={!soundOn} onChange={changeVolume} />
          <span className="w-slider-value flex-none text-right">{volume}</span>
        </li>
        {hapticsAvailable() && (
          <li className={ROW_CLASSES}>
            <span className="text-ink">Haptics</span>
            <Toggle label="Haptics" on={hapticsOn} onChange={setHaptics} />
          </li>
        )}
      </ul>
    </Modal>
  );
}
