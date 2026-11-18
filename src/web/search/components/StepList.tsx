/** Numbered steps, each number on an ink disc. */
export function StepList({ steps }: { steps: readonly string[] }) {
  return (
    <ol className="flex flex-col gap-4">
      {steps.map((step, index) => (
        <li key={step} className="flex items-start gap-3">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-pill bg-ink text-label text-white">{index + 1}</span>
          <span className="text-body font-medium tracking-body">{step}</span>
        </li>
      ))}
    </ol>
  );
}
