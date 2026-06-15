import { type ReactNode } from "react";
import type { Rect } from "../lib/profile";

type WidgetHostProps = {
  id: string;
  position: Rect; // window-local coordinates
  children: ReactNode;
};

export function WidgetHost({ id, position, children }: WidgetHostProps) {
  return (
    <div
      id={`widget-${id}`}
      className="absolute pointer-events-none"
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        width: `${position.w}px`,
        height: `${position.h}px`,
      }}
    >
      {children}
    </div>
  );
}
