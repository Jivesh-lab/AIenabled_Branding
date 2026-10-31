"use client";

import { useEffect, useState } from "react";

/**
 * True only after `flag` has been continuously true for `delayMs`. Used so a loading skeleton appears for slow
 * requests but not as a one-frame flicker for fast ones. It never delays real content: when `flag` turns false the
 * result turns false immediately.
 */
export function useDelayedFlag(flag: boolean, delayMs = 150): boolean {
  const [delayed, setDelayed] = useState(false);
  useEffect(() => {
    if (!flag) {
      setDelayed(false);
      return;
    }
    const timer = setTimeout(() => setDelayed(true), delayMs);
    return () => clearTimeout(timer);
  }, [flag, delayMs]);
  return flag && delayed;
}

/** True once `flag` has been true for `ms` - drives the "taking longer than usual" message. */
export function useLongWait(flag: boolean, ms = 5000): boolean {
  return useDelayedFlag(flag, ms);
}
