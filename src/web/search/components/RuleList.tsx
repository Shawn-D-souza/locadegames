/** A game's rules, one a line, each with a small coral dot. */
export function RuleList({ rules }: { rules: readonly string[] }) {
  return (
    <ul className="flex flex-col gap-3">
      {rules.map((rule) => (
        <li key={rule} className="flex items-start gap-3">
          <span className="mt-2 size-2 shrink-0 rounded-pill bg-coral" aria-hidden="true" />
          <span className="text-body font-medium tracking-body">{rule}</span>
        </li>
      ))}
    </ul>
  );
}
