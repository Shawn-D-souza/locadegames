import type { ReactNode } from "react";

/** White outlined card with its label sitting on top of the top edge, like a folder tab (its page-color box hides the line under it). */
export function SectionCard({ label, children }: { label: string; children: ReactNode }) {
  return (
    <section className="w-full pt-[calc(var(--type-label-size)*var(--type-label-line-height))]">
      <div className="relative flex flex-col gap-4 rounded-card border-thin border-ink bg-white p-card">
        <h2 className="absolute top-0 left-4 -translate-y-full bg-background px-2 text-label tracking-caption text-section-label uppercase">{label}</h2>
        {children}
      </div>
    </section>
  );
}
