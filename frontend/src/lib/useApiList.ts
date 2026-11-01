"use client";

import { useCallback, useEffect, useState } from "react";

/**
 * Loads a list from one of the dashboard's endpoints. Each panel calls this on its own, so one failing source never
 * hides the others, and a failure is reported as `failed` - never as an empty list.
 *
 * `map` turns the raw records into what the panel shows. `pick` reads the list out of the response's `data` (default:
 * `data` itself is the list). Pass both as functions defined at module level so they are stable.
 */
const identity = (data: unknown) => data;

export function useApiList<T>(url: string, map: (records: unknown[]) => T[], pick: (data: unknown) => unknown = identity) {
  const [items, setItems] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setFailed(false);
    try {
      const res = await fetch(url);
      const json = await res.json().catch(() => null);
      const list = json?.success ? pick(json.data) : null;
      if (!res.ok || !Array.isArray(list)) throw new Error("unavailable");
      setItems(map(list));
    } catch {
      setFailed(true);
    } finally {
      setLoading(false);
    }
  }, [url, map, pick]);

  useEffect(() => {
    void load();
  }, [load]);

  return { items, loading, failed, reload: load };
}
