'use client';

export default function Error({ reset }) {
  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center text-center">
      <p className="text-6xl">⚠️</p>
      <h1 className="mt-4 font-display text-2xl font-bold text-ink">Something went wrong</h1>
      <p className="mt-1 text-sm text-gray-500">একটা unexpected error হয়েছে। আবার চেষ্টা করুন।</p>
      <button onClick={reset} className="btn-primary mt-5 text-sm">
        ↻ Try Again
      </button>
    </div>
  );
}