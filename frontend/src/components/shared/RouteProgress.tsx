"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";

/**
 * Thin top progress line for real page-to-page navigation, across the whole site.
 *
 * - Starts when an in-app link is clicked or code calls history.pushState (router.push) towards a different URL.
 * - Appears only if the navigation is still pending after ~120ms, so instant navigations show nothing.
 * - Ends as soon as the URL has actually changed (the destination route is ready), with a 20s safety stop.
 * - Indeterminate: it never shows a fake percentage. Reduced motion gets a static bar.
 */
function RouteProgressInner() {
  const pathname = usePathname();
  const search = useSearchParams().toString();
  const location = `${pathname}?${search}`;

  const [visible, setVisible] = useState(false);
  const pending = useRef(false);
  const showTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const safetyTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const lastLocation = useRef(location);

  const finish = useCallback(() => {
    pending.current = false;
    clearTimeout(showTimer.current);
    clearTimeout(safetyTimer.current);
    setVisible(false);
  }, []);

  const start = useCallback(() => {
    if (pending.current) return;
    pending.current = true;
    showTimer.current = setTimeout(() => setVisible(true), 120);
    safetyTimer.current = setTimeout(finish, 20_000);
  }, [finish]);

  // The URL changed: the destination is ready.
  useEffect(() => {
    if (lastLocation.current !== location) {
      lastLocation.current = location;
      finish();
    }
  }, [location, finish]);

  useEffect(() => {
    const differs = (target: URL) =>
      target.origin === window.location.origin && (target.pathname !== window.location.pathname || target.search !== window.location.search);

    const onClick = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const anchor = (event.target as Element | null)?.closest?.("a[href]") as HTMLAnchorElement | null;
      if (!anchor || anchor.target === "_blank" || anchor.hasAttribute("download")) return;
      if (differs(new URL(anchor.href, window.location.href))) start();
    };
    document.addEventListener("click", onClick, true);

    const originalPush = window.history.pushState;
    window.history.pushState = function patched(this: History, ...args: Parameters<History["pushState"]>) {
      const url = args[2];
      if (url && differs(new URL(String(url), window.location.href))) start();
      return originalPush.apply(this, args);
    };

    return () => {
      document.removeEventListener("click", onClick, true);
      window.history.pushState = originalPush;
      clearTimeout(showTimer.current);
      clearTimeout(safetyTimer.current);
    };
  }, [start]);

  if (!visible) return null;
  return (
    <div role="status" className="pointer-events-none fixed inset-x-0 top-0 z-[100] h-[3px] overflow-hidden bg-brand/15">
      <span className="sr-only">Loading page</span>
      <div className="h-full w-2/5 bg-brand motion-reduce:w-full motion-reduce:opacity-70 animate-[route-progress-slide_1.1s_ease-in-out_infinite] motion-reduce:animate-none" />
    </div>
  );
}

export default function RouteProgress() {
  // useSearchParams needs a Suspense boundary; the fallback is intentionally empty.
  return (
    <Suspense fallback={null}>
      <RouteProgressInner />
    </Suspense>
  );
}
