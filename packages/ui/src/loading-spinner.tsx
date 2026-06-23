// packages/ui/src/LoadingSpinner.tsx
interface LoadingSpinnerProps {
  show: boolean; // 🎯 Tied directly to TanStack's isPending state
  fullScreen?: boolean; // If true, covers the entire viewport to block interactions
}

export function LoadingSpinner({ show, fullScreen = false }: LoadingSpinnerProps) {
  // If TanStack says pending is false, completely remove the spinner from the DOM
  if (!show) return null;

  const containerClasses = fullScreen
    ? "fixed inset-0 bg-gray-900/60 backdrop-blur-sm z-50 flex items-center justify-center"
    : "flex items-center justify-center p-4";

  return (
    <div className={containerClasses}>
      <div className="flex flex-col items-center gap-3 bg-rsc-panel p-6 rounded-rsc shadow-rsc border border-rsc-line">
        <svg
          className="animate-spin h-10 w-10 text-rsc-brand"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="3"
          />
          <path
            className="opacity-100"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
        {fullScreen && (
          <p className="text-xs font-bold uppercase tracking-widest text-rsc-ink animate-pulse">
            Logging in...
          </p>
        )}
      </div>
    </div>
  );
}
