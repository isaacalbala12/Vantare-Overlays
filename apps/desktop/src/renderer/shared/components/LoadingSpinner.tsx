interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  color?: string;
  label?: string;
}

const sizeMap: Record<'sm' | 'md' | 'lg', number> = {
  sm: 16,
  md: 24,
  lg: 32,
};

const strokeWidthMap: Record<'sm' | 'md' | 'lg', number> = {
  sm: 2,
  md: 2.5,
  lg: 3,
};

export function LoadingSpinner({
  size = 'md',
  color = 'currentColor',
  label,
}: LoadingSpinnerProps) {
  const dimension = sizeMap[size];
  const strokeWidth = strokeWidthMap[size];

  return (
    <svg
      className="animate-spin"
      width={dimension}
      height={dimension}
      viewBox="0 0 24 24"
      fill="none"
      role="status"
      aria-label={label ?? 'Loading'}
    >
      <circle
        cx="12"
        cy="12"
        r="10"
        stroke={color}
        strokeWidth={strokeWidth}
        opacity={0.2}
      />
      <path
        d="M12 2a10 10 0 0 1 10 10"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
      />
    </svg>
  );
}
