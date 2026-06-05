interface DeltaIndicatorProps {
  delta: number;
}

export function DeltaIndicator({ delta }: DeltaIndicatorProps) {
  const isPositive = delta >= 0;
  const color = isPositive ? 'text-red-400' : 'text-green-400';
  const sign = isPositive ? '+' : '';
  return <span className={`font-mono tabular-nums ${color}`}>{sign}{delta.toFixed(3)}</span>;
}
