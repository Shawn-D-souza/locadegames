import type { ReactNode } from "react";

/** A white card with its heading inside, for a topic page's sections (their headings are too long for a tab label). */
export function ContentCard({ heading, children }: { heading: string; children: ReactNode }) {
  return (
    <section className="flex w-full flex-col gap-4 rounded-card border-thin border-ink bg-white p-card">
      <h2 className="font-display text-title font-black uppercase">{heading}</h2>
      {children}
    </section>
  );
}
