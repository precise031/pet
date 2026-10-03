'use client';

import { useRef, type PointerEvent as ReactPointerEvent, type ReactNode } from 'react';

export interface WindowState {
  id: number;
  title: string;
  x: number;
  y: number;
  w: number;
  attract?: string;
}

interface Props {
  win: WindowState;
  z: number;
  onMove: (id: number, x: number, y: number) => void;
  onFocus: (id: number) => void;
  onClose: (id: number) => void;
  children: ReactNode;
}

/** Okienko, które można przeciągać za pasek tytułu – maskotka jeździ na nim i z niego spada. */
export function FloatingWindow({ win, z, onMove, onFocus, onClose, children }: Props) {
  const drag = useRef<{ dx: number; dy: number } | null>(null);

  const onDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest('button')) return;
    drag.current = { dx: e.clientX - win.x, dy: e.clientY - win.y };
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const onDrag = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!drag.current) return;
    const x = Math.min(window.innerWidth - 80, Math.max(-win.w + 80, e.clientX - drag.current.dx));
    const y = Math.min(window.innerHeight - 40, Math.max(0, e.clientY - drag.current.dy));
    onMove(win.id, x, y);
  };
  const onUp = () => {
    drag.current = null;
  };

  return (
    <div
      role="dialog"
      aria-labelledby={`win-${win.id}`}
      className="window floating"
      style={{ left: win.x, top: win.y, width: win.w, zIndex: 50 + z }}
      data-pet-surface="perimeter"
      data-pet-attract={win.attract}
      onPointerDownCapture={() => onFocus(win.id)}
    >
      <div className="window-bar" onPointerDown={onDown} onPointerMove={onDrag} onPointerUp={onUp} onPointerCancel={onUp}>
        <span className="traffic" aria-hidden="true">
          <i />
          <i />
          <i />
        </span>
        <strong id={`win-${win.id}`}>{win.title}</strong>
        <button type="button" className="icon-btn" aria-label="Zamknij" onClick={() => onClose(win.id)}>
          ✕
        </button>
      </div>
      {children}
    </div>
  );
}
