import { useEffect, useRef } from "react";

const TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes
const EVENTS = [
  "mousemove",
  "mousedown",
  "keydown",
  "touchstart",
  "scroll",
] as const;

export function useSessionTimeout(onTimeout: () => void, enabled: boolean) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!enabled) return;

    const reset = () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        onTimeout();
      }, TIMEOUT_MS);
    };

    for (const e of EVENTS) {
      window.addEventListener(e, reset, { passive: true });
    }
    reset();

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      for (const e of EVENTS) {
        window.removeEventListener(e, reset);
      }
    };
  }, [onTimeout, enabled]);
}
