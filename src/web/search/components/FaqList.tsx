import type { Faq } from "../types";
import { BodyText } from "./BodyText";

/** Questions people search for, each with its answer. */
export function FaqList({ faq }: { faq: readonly Faq[] }) {
  return (
    <div className="flex flex-col gap-6">
      {faq.map((item) => (
        <div key={item.question} className="flex flex-col gap-2">
          <h3 className="text-label font-bold">{item.question}</h3>
          <BodyText>{item.answer}</BodyText>
        </div>
      ))}
    </div>
  );
}
