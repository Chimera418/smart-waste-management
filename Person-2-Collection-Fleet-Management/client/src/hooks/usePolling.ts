import { useEffect, useRef } from 'react';

export function usePolling(cb: () => void | Promise<void>, intervalMs = 5000, enabled = true) {
  const saved = useRef(cb);
  saved.current = cb;

  useEffect(() => {
    if (!enabled) return;
    const id = setInterval(() => saved.current(), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs, enabled]);
}
