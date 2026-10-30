const LINE_CLASSES = "flex-1 border-t-dash border-dashed border-line";

/** Dashed rule with a short word in the middle ("OR"). */
export function Divider({ label }: { label: string }) {
  return (
    <div className="flex w-full items-center gap-6" role="separator">
      <span className={LINE_CLASSES} />
      <span className="text-caption tracking-caption text-subtle">{label}</span>
      <span className={LINE_CLASSES} />
    </div>
  );
}
