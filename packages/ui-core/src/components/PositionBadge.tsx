interface PositionBadgeProps {
  position: number;
  total?: number;
}

export function PositionBadge({ position, total }: PositionBadgeProps) {
  const color = position === 1 ? 'text-yellow-400' : position <= 3 ? 'text-orange-400' : 'text-white';
  return (
    <span className={`font-bold ${color} tabular-nums`}>
      {position}{total ? `/${total}` : ''}
    </span>
  );
}
