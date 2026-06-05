interface ErrorMessageProps {
  message: string;
  onRetry?: () => void;
  code?: string;
}

export function ErrorMessage({ message, onRetry, code }: ErrorMessageProps) {
  return (
    <div
      role="alert"
      className="rounded-lg border border-red-500/30 bg-black/60 backdrop-blur-md p-4"
    >
      <div className="flex items-start gap-3">
        <svg
          className="mt-0.5 shrink-0 text-red-400"
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>

        <div className="min-w-0 flex-1">
          <p className="text-sm text-red-200">{message}</p>
          {code && (
            <p className="mt-1 text-xs text-red-400/70 font-mono">{code}</p>
          )}
        </div>

        {onRetry && (
          <button
            onClick={onRetry}
            className="shrink-0 rounded-md border border-red-500/40 px-3 py-1 text-xs font-medium text-red-200 transition-colors hover:bg-red-500/10 hover:border-red-500/60 focus:outline-none focus:ring-2 focus:ring-red-500/30"
          >
            Retry
          </button>
        )}
      </div>
    </div>
  );
}
