import type { ReactNode } from "react";

interface ModalProps {
  title: string;
  children?: ReactNode;
  actions: ReactNode;
  /** Tapping outside the box closes it; leave out for modals that need an answer. */
  onDismiss?: () => void;
}

/** A box over an ink backdrop; never taller than the screen (it scrolls inside on very short screens). */
export function Modal({ title, children, actions, onDismiss }: ModalProps) {
  return (
    <div className="fixed inset-0 z-modal flex items-center justify-center bg-backdrop p-gutter" onClick={onDismiss}>
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
