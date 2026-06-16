import { type ReactNode } from 'react';

type ScrollableMainProps = {
  children: ReactNode;
  className?: string;
};

export function ScrollableMain({ children, className = '' }: ScrollableMainProps) {
  return (
    <main className={`scrollable-main ${className}`}>
      {children}
    </main>
  );
}
