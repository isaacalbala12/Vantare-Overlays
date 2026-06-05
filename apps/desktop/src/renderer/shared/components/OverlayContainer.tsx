import { forwardRef } from 'react';

interface OverlayContainerProps {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  onClick?: (e: React.MouseEvent) => void;
}

export const OverlayContainer = forwardRef<HTMLDivElement, OverlayContainerProps>(
  function OverlayContainer({ children, className = '', style, onClick }, ref) {
    return (
      <div
        ref={ref}
        className={`absolute bg-transparent overflow-hidden ${className}`}
        style={style}
        onClick={onClick}
      >
        {children}
      </div>
    );
  },
);