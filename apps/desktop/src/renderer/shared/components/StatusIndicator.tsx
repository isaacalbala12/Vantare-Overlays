interface StatusIndicatorProps {
  status: 'connected' | 'disconnected' | 'error';
  label?: string;
}

const colorMap: Record<StatusIndicatorProps['status'], string> = {
  connected: 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]',
  disconnected: 'bg-yellow-500 shadow-[0_0_8px_rgba(234,179,8,0.4)]',
  error: 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.6)]',
};

const pulseAnimation: Record<StatusIndicatorProps['status'], string> = {
  connected: 'animate-pulse',
  disconnected: '',
  error: '',
};

export function StatusIndicator({ status, label }: StatusIndicatorProps) {
  return (
    <span className="inline-flex items-center gap-2" aria-label={label ?? status}>
      <span
        className={`inline-block h-2.5 w-2.5 rounded-full ${colorMap[status]} ${pulseAnimation[status]}`}
      />
      {label && <span className="text-xs text-white/70">{label}</span>}
    </span>
  );
}