import type { ReactNode } from "react";
import { TabCard } from "../../../components/TabCard";

interface StatusCardProps {
  title: string;
  children: ReactNode;
}

/** A short message over the arena (you're out, the match is over), in a tab card so it reads on any land. */
export function StatusCard({ title, children }: StatusCardProps) {
  return (
    <div className="w-full max-w-content animate-pop-in px-gutter">
      <TabCard title={title} className="items-center gap-2 bg-white text-center text-ink">
        {children}
      </TabCard>
    </div>
  );
}
