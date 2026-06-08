import { Link } from 'react-router-dom';
import type { CSSProperties, ReactNode } from 'react';

interface DashboardPanelProps {
  title: string;
  to: string;
  testId: string;
  loading?: boolean;
  variant?: 'hero' | 'medium' | 'small';
  children: ReactNode;
  className?: string;
  area?: 'overlays' | 'sim' | 'themes' | 'account' | 'settings';
  style?: CSSProperties;
}

function Skeleton({ variant }: { variant: NonNullable<DashboardPanelProps['variant']> }) {
  const heightClass = variant === 'hero' ? 'h-32' : 'h-20';
  return <div className={`dashboard-panel-skeleton ${heightClass}`} />;
}

export default function DashboardPanel({
  title,
  to,
  testId,
  loading = false,
  variant = 'medium',
  children,
  className = '',
  area,
  style,
}: DashboardPanelProps) {
  const areaClass = area ? `dashboard-area-${area}` : '';

  return (
    <Link
      to={to}
      data-testid={testId}
      className="block h-full no-underline text-inherit"
      style={style}
    >
      <div className={`dashboard-panel dashboard-panel-${variant} ${areaClass} ${className}`.trim()}>
        {/* Title bar */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--color-border-subtle)]">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
            {title}
          </h3>
        </div>

        {/* Content */}
        <div className="p-4">
          {loading ? <Skeleton variant={variant} /> : children}
        </div>
      </div>
    </Link>
  );
}
