/** Yellow pill at the top for short notices (reconnecting, invalid move), between the corner buttons so it never covers them. */
export function Toast({ message }: { message: string }) {
  return (
    <div className="pointer-events-none fixed inset-x-[calc(var(--layout-gutter)+var(--layout-icon-button)+var(--space-2))] top-4 z-toast flex justify-center" role="status" aria-live="polite">
      <div className="animate-pop-in rounded-pill border-thin border-ink bg-waiting px-4 py-3 text-center text-ink shadow-lip-small">{message}</div>
    </div>
  );
}
