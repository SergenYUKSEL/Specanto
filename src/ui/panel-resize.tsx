import { useEffect, useRef, useState } from 'react';

const clamp = (value: number, minimum: number, maximum: number) => Math.min(maximum, Math.max(minimum, value));

export function usePanelWidths() {
  const root = useRef<HTMLDivElement>(null);
  const [area, setArea] = useState({ width: 0, viewport: 0 });
  const [navigation, setNavigation] = useState<number | null>(null);
  const [request, setRequest] = useState<number | null>(null);
  useEffect(() => {
    const element = root.current;
    if (!element) return;
    const measure = () => setArea({ width: element.getBoundingClientRect().width, viewport: window.innerWidth });
    measure();
    const observer = new ResizeObserver(measure); observer.observe(element);
    window.addEventListener('resize', measure);
    return () => { observer.disconnect(); window.removeEventListener('resize', measure); };
  }, []);
  const navigationVisible = area.viewport > 700 && area.width >= 546;
  const requestVisible = area.viewport > 1100 && area.width > 1100;
  const requestStacked = area.viewport > 1100 && area.width > 0 && area.width <= 1100;
  // Keep the document readable while fitting both independently adjustable side panels.
  const available = Math.max(area.width, requestVisible ? 872 : 546);
  const navigationMaximum = Math.min(420, available - 320 - (requestVisible ? 332 : 6));
  const navigationWidth = clamp(navigation ?? 248, 220, navigationMaximum);
  const requestMaximum = Math.max(320, Math.min(680, available - navigationWidth - 332));
  const requestDefault = area.viewport >= 1650 ? 430 : area.viewport <= 1260 ? 350 : 400;
  const requestWidth = clamp(request ?? requestDefault, 320, requestMaximum);
  return {
    root, ready: area.width > 0, navigationVisible, requestVisible, requestStacked,
    navigation: { value: navigationWidth, minimum: 220, maximum: Math.min(navigationMaximum, available - (requestVisible ? requestWidth + 12 : 6) - 320), change: setNavigation, reset: () => setNavigation(null) },
    request: { value: requestWidth, minimum: 320, maximum: requestMaximum, change: setRequest, reset: () => setRequest(null) },
  };
}

type SeparatorProps = {
  className: string; label: string; hint: string; direction?: 1 | -1;
  value: number; minimum: number; maximum: number; change: (width: number) => void; reset: () => void;
};

export function PanelSeparator({ className, label, hint, value, minimum, maximum, change, reset, direction = 1 }: SeparatorProps) {
  const drag = useRef<{ pointer: number; x: number; value: number } | null>(null);
  const [active, setActive] = useState(false);
  const update = (next: number) => change(clamp(next, minimum, maximum));
  return <div className={`sp-resize ${className}`} role="separator" tabIndex={0} aria-label={label} aria-orientation="vertical" aria-valuemin={Math.round(minimum)} aria-valuemax={Math.round(maximum)} aria-valuenow={Math.round(value)} title={hint} data-resizing={active || undefined}
    onDoubleClick={reset}
    onPointerDown={event => {
      if (event.button !== 0) return;
      event.preventDefault(); event.currentTarget.focus({ preventScroll: true });
      drag.current = { pointer: event.pointerId, x: event.clientX, value };
      event.currentTarget.setPointerCapture(event.pointerId); setActive(true);
    }}
    onPointerMove={event => {
      if (drag.current?.pointer === event.pointerId) update(drag.current.value + direction * (event.clientX - drag.current.x));
    }}
    onPointerUp={event => {
      if (drag.current?.pointer !== event.pointerId) return;
      drag.current = null; setActive(false); event.currentTarget.releasePointerCapture(event.pointerId);
    }}
    onPointerCancel={() => { if (drag.current) change(drag.current.value); drag.current = null; setActive(false); }}
    onLostPointerCapture={() => { drag.current = null; setActive(false); }}
    onKeyDown={event => {
      if (event.key === 'Escape' && drag.current) {
        change(drag.current.value); const pointer = drag.current.pointer; drag.current = null; setActive(false);
        if (event.currentTarget.hasPointerCapture(pointer)) event.currentTarget.releasePointerCapture(pointer);
      } else if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
        event.preventDefault(); update(value + (event.key === 'ArrowRight' ? 1 : -1) * direction * (event.shiftKey ? 64 : 16));
      } else if (event.key === 'Home' || event.key === 'End') {
        event.preventDefault(); update(event.key === 'Home' ? minimum : maximum);
      } else if (event.key === 'Enter') { event.preventDefault(); reset(); }
    }}
  />;
}
