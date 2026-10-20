import { useEffect, useRef, type MutableRefObject, type RefObject } from 'react';

export interface CanvasSize {
  width: number;
  height: number;
  dpr: number;
}

/**
 * Keeps a full-bleed overlay canvas sized to its parent (capped at 2× DPR) and
 * re-flags nearest-neighbor sampling after every resize, since resizing a
 * canvas resets its context state.
 */
export function useOverlayCanvas(
  canvasRef: RefObject<HTMLCanvasElement | null>,
): MutableRefObject<CanvasSize> {
  const size = useRef<CanvasSize>({ width: 0, height: 0, dpr: 1 });
  useEffect(() => {
    const canvas = canvasRef.current;
    const parent = canvas?.parentElement;
    if (!canvas || !parent) return;
    const resize = () => {
      const box = parent.getBoundingClientRect();
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      size.current = { width: box.width, height: box.height, dpr };
      canvas.width = Math.round(box.width * dpr);
      canvas.height = Math.round(box.height * dpr);
      canvas.style.width = `${box.width}px`;
      canvas.style.height = `${box.height}px`;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.imageSmoothingEnabled = false;
      }
    };
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(parent);
    window.addEventListener('resize', resize);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', resize);
    };
  }, [canvasRef]);
  return size;
}
