"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";

/**
 * Top progress bar for every page-to-page navigation across the whole site.
 *
 * It starts the moment the user acts, not after a delay, and it covers all the ways a page can change:
 *   - a click on an in-app link,
 *   - code navigation (router.push / router.replace, e.g. search results, form redirects),
 *   - a server refresh (router.refresh),
 *   - browser back / forward.
 * The last three are detected through Next's own page-data requests (the `_rsc` fetches that are not prefetches), so
 * nothing has to call the bar by hand.
 *
 * The bar trickles toward 90% while the page is pending, jumps to 100% when the destination is ready, then fades.
 * It stays on screen for at least MIN_VISIBLE_MS so a fast navigation still reads as a deliberate loader instead of
 * a flicker. It never reports a fake finished state: a 20s safety stop ends it if something stalls.
 * Reduced motion gets a static bar with no trickle animation.
 */

const MIN_VISIBLE_MS = 450;
const TRICKLE_MS = 180;
const SAFETY_MS = 20_000;
const FADE_MS = 250;

function RouteProgressInner() {
  const pathname = usePathname();
  const search = useSearchParams().toString();
  const location = `${pathname}?${search}`;

  const [progress, setProgress] = useState(0);
  const [visible, setVisible] = useState(false);

  const active = useRef(false);
  const startedAt = useRef(0);
  const inflight = useRef(0);
  const trickle = useRef<ReturnType<typeof setInterval> | undefined>(undefined);
  const safety = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const finishing = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const lastLocation = useRef(location);

  const clearTimers = useCallback(() => {
    clearInterval(trickle.current);
    clearTimeout(safety.current);
    clearTimeout(finishing.current);
  }, []);

  const finish = useCallback(() => {
    if (!active.current) return;
    active.current = false;
    clearInterval(trickle.current);
    clearTimeout(safety.current);
    const wait = Math.max(0, MIN_VISIBLE_MS - (Date.now() - startedAt.current));
    finishing.current = setTimeout(() => {
      setProgress(100);
      finishing.current = setTimeout(() => {
        setVisible(false);
        // reset after the fade, so the next run starts from zero without a visible rewind
        finishing.current = setTimeout(() => setProgress(0), FADE_MS);
      }, 220);
    }, wait);
  }, []);

  const start = useCallback(() => {
    if (active.current) return;
    clearTimers();
    active.current = true;
    startedAt.current = Date.now();
    setVisible(true);
    setProgress(12);
    trickle.current = setInterval(() => {
      // ease toward 90%: big steps at first, small ones as it nears the end
      setProgress((p) => (p < 90 ? p + (90 - p) * 0.12 : p));
    }, TRICKLE_MS);
    safety.current = setTimeout(finish, SAFETY_MS);
  }, [clearTimers, finish]);

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

    // 1. Clicks on in-app links
    const onClick = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const anchor = (event.target as Element | null)?.closest?.("a[href]") as HTMLAnchorElement | null;
      if (!anchor || anchor.target === "_blank" || anchor.hasAttribute("download")) return;
      if (differs(new URL(anchor.href, window.location.href))) start();
    };
    document.addEventListener("click", onClick, true);

    // 2. Back / forward
    const onPopState = () => start();
    window.addEventListener("popstate", onPopState);

    // 3. Code navigation and refreshes: Next fetches the destination's page data with an `_rsc` request. Prefetches
    //    (hover/viewport) carry a prefetch header and are ignored; real navigations are not.
    const originalFetch = window.fetch;
    window.fetch = function patchedFetch(this: unknown, input: RequestInfo | URL, init?: RequestInit) {
      let url = "";
      let headers: Headers | undefined;
      try {
        url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
        headers = new Headers(init?.headers ?? (input instanceof Request ? input.headers : undefined));
      } catch {
        return originalFetch.call(this, input, init);
      }
      const isPageData = url.includes("_rsc=") && !headers?.has("next-router-prefetch");
      if (!isPageData) return originalFetch.call(this, input, init);

      inflight.current += 1;
      start();
      return originalFetch.call(this, input, init).finally(() => {
        inflight.current -= 1;
        // Give the router a moment to commit the new route; the URL-change effect usually finishes it first.
        setTimeout(() => {
          if (inflight.current === 0) finish();
        }, 150);
      });
    } as typeof window.fetch;

    return () => {
      document.removeEventListener("click", onClick, true);
      window.removeEventListener("popstate", onPopState);
      window.fetch = originalFetch;
      clearTimers();
    };
  }, [start, finish, clearTimers]);

  return (
    <div
      aria-hidden={!visible}
      role={visible ? "progressbar" : undefined}
      aria-label={visible ? "Loading page" : undefined}
      className="pointer-events-none fixed inset-x-0 top-0 z-[100] h-[3px]"
      style={{ opacity: visible ? 1 : 0, transition: `opacity ${FADE_MS}ms ease` }}
    >
      <div
        className="h-full bg-brand shadow-[0_0_8px_rgba(29,78,216,0.55)] transition-[width] duration-200 ease-out motion-reduce:transition-none"
        style={{ width: `${progress}%` }}
      >
        {/* a soft head on the leading edge, hidden for reduced motion */}
        <span className="float-right h-full w-16 bg-gradient-to-r from-transparent to-white/40 motion-reduce:hidden" />
      </div>
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
