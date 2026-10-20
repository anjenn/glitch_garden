import { useEffect, useState } from 'react';

/** A coarse wall clock (ms) that re-renders consumers every `intervalMs`. */
export function useClock(intervalMs = 15_000): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const handle = window.setInterval(() => setNow(Date.now()), intervalMs);
    return () => window.clearInterval(handle);
  }, [intervalMs]);
  return now;
}
