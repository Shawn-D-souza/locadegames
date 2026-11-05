import { clsx } from "clsx";
import { useState, type FormEvent } from "react";
import { playSound } from "../services/soundPlayer";
import { Icon } from "./Icon";

interface NameFieldProps {
  value: string;
  /** Shown (and played as) when the field is empty. */
  fallback: string;
  maxLength: number;
  onChange(value: string): void;
}

/** The chip and the input look the same, so editing happens in place. */
const FIELD_CLASSES = "flex min-h-tap w-full items-center gap-2 rounded-control border-outline border-ink bg-white px-4 text-left text-label text-ink";

/** Your name as a finished-looking chip ("Brave Otter (YOU)" + pencil); tap to edit it in place. */
export function NameField({ value, fallback, maxLength, onChange }: NameFieldProps) {
  const [editing, setEditing] = useState(false);
  const shown = value.trim() || fallback;

  const finish = (event?: FormEvent) => {
    event?.preventDefault();
    setEditing(false);
  };

  if (editing) {
    return (
      <form className="w-full" onSubmit={finish}>
        <input
          className={clsx(FIELD_CLASSES, "cursor-text outline-none placeholder:text-ink-soft")}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onBlur={() => finish()}
          maxLength={maxLength}
          placeholder={fallback}
          aria-label="Your name"
          autoComplete="nickname"
          autoFocus
          enterKeyHint="done"
        />
      </form>
    );
  }

  return (
    <button type="button" className={clsx(FIELD_CLASSES, "cursor-pointer")} onClick={() => {
      playSound("fieldTap");
      setEditing(true);
    }} aria-label={`Your name: ${shown}. Edit`}>
      <span className="min-w-0 truncate">{shown}</span>
      <span className="shrink-0 text-caption font-medium text-subtle">(YOU)</span>
      <Icon name="edit" className="ml-auto size-icon shrink-0 text-subtle" />
    </button>
  );
}
