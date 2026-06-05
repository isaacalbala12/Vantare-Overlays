interface TimeDisplayProps {
  timeMs: number;
  showHundredths?: boolean;
}

export function TimeDisplay({ timeMs, showHundredths = true }: TimeDisplayProps) {
  const totalSeconds = timeMs / 1000;
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = Math.floor(totalSeconds % 60);
  const hundredths = Math.floor((timeMs % 1000) / 10);

  const formatted = showHundredths
    ? `${minutes}:${seconds.toString().padStart(2, '0')}.${hundredths.toString().padStart(2, '0')}`
    : `${minutes}:${seconds.toString().padStart(2, '0')}`;

  return <span className="font-mono tabular-nums">{formatted}</span>;
}
