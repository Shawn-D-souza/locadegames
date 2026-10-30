import { Modal } from "./Modal";
import { PillButton } from "./PillButton";

/** Settings we plan to offer; none work yet, so each row says so. */
const PLANNED_SETTINGS = ["Music", "Sound effects", "Haptics"] as const;

/** Placeholder settings menu: shows what is coming without pretending it works. */
export function SettingsModal({ onClose }: { onClose(): void }) {
  return (
    <Modal
      title="Settings"
      onDismiss={onClose}
      actions={
        <PillButton variant="deep" fullWidth onClick={onClose}>
          CLOSE
        </PillButton>
      }
    >
      <ul className="flex w-full flex-col">
        {PLANNED_SETTINGS.map((setting) => (
          <li
            key={setting}
            className="flex min-h-tap items-center justify-between gap-4 border-dashed border-line text-left text-ink-muted not-last:border-b-dash"
          >
            <span>{setting}</span>
            <span className="text-caption tracking-caption text-subtle">COMING SOON</span>
          </li>
        ))}
      </ul>
    </Modal>
  );
}
