import type { ReactNode } from "react";

/** A paragraph of reading text (the `body` size, Mono Medium). */
export function BodyText({ children }: { children: ReactNode }) {
  return <p className="text-body font-medium tracking-body">{children}</p>;
}
