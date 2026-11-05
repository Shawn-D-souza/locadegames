import { useEffect, type ReactNode } from "react";
import { playSound } from "../services/soundPlayer";

interface ModalProps {
  title: string;
  children?: ReactNode;
  actions: ReactNode;
  /** Tapping outside the box closes it; leave out for modals that need an answer. */
  onDismiss?: () => void;
  /** It asks something serious (quit, leave, connection lost), and sounds it. */
  serious?: boolean;
}

/** A box over an ink backdrop; never taller than the screen (it scrolls inside on very short screens). */
export function Modal({ title, children, actions, onDismiss, serious }: ModalProps) {
  useEffect(() => {
    // An ordinary popup opens on its button's own press and adds nothing to it (owner's ratings).
    if (serious) playSound("warningPopupOpen");
  }, [serious]);
  const dismissByTap =
    onDismiss &&
    (() => {
      playSound("popupClose");
      onDismiss();
    });
  return (
    <div className="fixed inset-0 z-modal flex items-center justify-center bg-backdrop p-gutter" onClick={dismissByTap}>
      <div
        className="flex max-h-full w-full max-w-content animate-pop-in flex-col items-center gap-6 overflow-y-auto rounded-card border-thin border-ink bg-white p-6 text-center"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(event) => event.stopPropagation()}
      >
        <h2 className="font-display text-title font-black text-ink uppercase">{title}</h2>
        {children}
        {actions}
      </div>
    </div>
  );
}
