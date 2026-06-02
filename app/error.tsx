'use client';
export default function Error({ reset }: { reset: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 text-center">
      <h2 className="text-2xl font-bold mb-3">Something went wrong</h2>
      <p className="text-[var(--color-muted-fg)] mb-6">Please try refreshing the page.</p>
      <button onClick={reset}
        className="px-5 py-2 bg-[var(--color-primary)] text-white rounded-lg font-medium hover:bg-[var(--color-primary-light)] transition-colors cursor-pointer">
        Try again
      </button>
    </div>
  );
}
