import React from 'react';

interface GlassPanelProps {
  children: React.ReactNode;
  className?: string;
  opacity?: number;
}

export function GlassPanel({ children, className = '', opacity = 0.6 }: GlassPanelProps) {
  return (
    <div
      className={`glass-panel ${className}`}
      style={{ background: `rgba(0, 0, 0, ${opacity})` }}
    >
      {children}
    </div>
  );
}
