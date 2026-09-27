'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import {
  estimatedRoundTripMs,
  getInFlightCount,
  getLastRequestStartedAt,
  subscribeToNetworkActivity,
} from '@/lib/network-activity';

/** Requests that start this soon after a click or page change belong to it. */
const INTERACTION_WINDOW_MS = 450;
/** After the page changes, give its data requests this long to start. */
const SETTLE_AFTER_ROUTE_MS = 160;
/** Never leave the bar spinning forever if something hangs. */
const MAX_ACTIVE_MS = 20_000;

function currentPath() {
  return window.location.pathname + window.location.search;
}

/**
 * Connection-aware loading bar across the top of every page.
 *
 * - Clicking an internal link (or submitting the GET search form) starts the
 *   bar and holds the page change for about one round trip of this visitor's
 *   connection — measured from their recent API calls, or the browser's
 *   Network Information estimate — so pages load the way they would over the
 *   network instead of snapping in. The bar then keeps running until the new
 *   page's own data requests finish.
 * - Clicking a button that sends a request shows the bar until the response
 *   arrives.
 * - Background polling (payment status every 3s) does not trigger it.
 */
export default function NavigationProgress() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [visible, setVisible] = useState(false);
  const [progress, setProgress] = useState(0);

  const active = useRef(false);
  const startedAt = useRef(0);
  const pendingNavigation = useRef<string | null>(null);
  const navigationTimer = useRef<number>();
  const interactionUntil = useRef(0);
  const settleUntil = useRef(0);
  const finishTimer = useRef<number>();

  const start = useCallback(() => {
    window.clearTimeout(finishTimer.current);
    if (!active.current) {
      active.current = true;
      startedAt.current = Date.now();
      setProgress(0.08);
      setVisible(true);
      document.documentElement.classList.add('tf-loading');
    }
  }, []);

  const finish = useCallback(() => {
    if (!active.current) return;
    active.current = false;
    pendingNavigation.current = null;
    document.documentElement.classList.remove('tf-loading');
    setProgress(1);
    finishTimer.current = window.setTimeout(() => {
      setVisible(false);
      setProgress(0);
    }, 320);
  }, []);

  const maybeFinish = useCallback(() => {
    if (!active.current) return;
    if (Date.now() - startedAt.current > MAX_ACTIVE_MS) return finish();
    if (pendingNavigation.current) return;
    if (getInFlightCount() > 0) return;
    if (Date.now() < settleUntil.current) return;
    finish();
  }, [finish]);

  // Links, buttons and the GET search form.
  useEffect(() => {
    const navigate = (target: string, replace = false) => {
      start();
      pendingNavigation.current = target;
      window.clearTimeout(navigationTimer.current);
      router.prefetch(target);
      navigationTimer.current = window.setTimeout(() => {
        if (pendingNavigation.current !== target) return;
        if (replace) router.replace(target);
        else router.push(target);
      }, estimatedRoundTripMs());
    };

    const onClick = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0) return;
      const element = event.target as Element | null;
      if (!element) return;

      const anchor = element.closest('a[href]') as HTMLAnchorElement | null;
      if (anchor) {
        if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
        if (anchor.hasAttribute('download') || anchor.dataset.noProgress !== undefined) return;
        if (anchor.target && anchor.target !== '_self') return;
        const url = new URL(anchor.href, window.location.href);
        if (url.origin !== window.location.origin) return;
        const target = url.pathname + url.search;
        // Same page (or only the #hash changes): let the browser scroll.
        if (target === currentPath()) return;
        event.preventDefault();
        navigate(target + url.hash);
        return;
      }

      const button = element.closest('button, [role="button"], input[type="submit"]') as HTMLButtonElement | null;
      if (button && !button.disabled && button.getAttribute('aria-disabled') !== 'true') {
        interactionUntil.current = Date.now() + INTERACTION_WINDOW_MS;
      }
    };

    // Plain GET forms with an explicit action (the hero search) would do a
    // full page reload; route them through the same connection-paced path.
    const onSubmit = (event: SubmitEvent) => {
      if (event.defaultPrevented) return;
      const form = event.target as HTMLFormElement | null;
      if (!form || !form.getAttribute('action') || (form.method || 'get').toLowerCase() !== 'get') return;
      const url = new URL(form.action, window.location.href);
      if (url.origin !== window.location.origin) return;
      const params = new URLSearchParams();
      new FormData(form).forEach((value, key) => {
        if (typeof value === 'string' && value !== '') params.append(key, value);
      });
      event.preventDefault();
      const query = params.toString();
      const target = url.pathname + (query ? '?' + query : '');
      if (target === currentPath()) return;
      navigate(target);
    };

    const onPopState = () => {
      // Back/forward: the browser changes the page itself; show the bar
      // until the page it lands on has its data.
      start();
      interactionUntil.current = Date.now() + INTERACTION_WINDOW_MS;
      settleUntil.current = Date.now() + SETTLE_AFTER_ROUTE_MS;
    };

    document.addEventListener('click', onClick, true);
    document.addEventListener('submit', onSubmit);
    window.addEventListener('popstate', onPopState);
    return () => {
      document.removeEventListener('click', onClick, true);
      document.removeEventListener('submit', onSubmit);
      window.removeEventListener('popstate', onPopState);
      window.clearTimeout(navigationTimer.current);
    };
  }, [router, start]);

  // A page change completes the navigation half; the new page's own data
  // requests (which start within a moment of mounting) keep the bar going.
  const routeKey = pathname + '?' + (searchParams?.toString() ?? '');
  const firstRoute = useRef(true);
  useEffect(() => {
    if (firstRoute.current) {
      firstRoute.current = false;
      return;
    }
    pendingNavigation.current = null;
    interactionUntil.current = Date.now() + INTERACTION_WINDOW_MS;
    settleUntil.current = Date.now() + SETTLE_AFTER_ROUTE_MS;
    // Programmatic navigations (router.push after an order is created, etc.)
    // also get the bar.
    start();
    const id = window.setTimeout(maybeFinish, SETTLE_AFTER_ROUTE_MS + 10);
    return () => window.clearTimeout(id);
  }, [routeKey, start, maybeFinish]);

  // Requests: start the bar for ones a click or page change caused; finish
  // when the last one returns.
  useEffect(() => {
    return subscribeToNetworkActivity(() => {
      if (getInFlightCount() > 0 && !active.current && getLastRequestStartedAt() <= interactionUntil.current) {
        start();
      }
      if (getInFlightCount() === 0) window.setTimeout(maybeFinish, 0);
    });
  }, [start, maybeFinish]);

  // Trickle forward while waiting, slowing as it nears the end, so the bar
  // speed reflects how long the network is actually taking.
  useEffect(() => {
    if (!visible || progress >= 1) return;
    const id = window.setInterval(() => {
      setProgress((p) => (p >= 1 ? p : Math.min(0.94, p + (0.94 - p) * 0.08)));
      maybeFinish();
    }, 200);
    return () => window.clearInterval(id);
  }, [visible, progress, maybeFinish]);

  if (!visible) return null;

  return (
    <div
      className="tf-progress"
      role="progressbar"
      aria-label="Loading"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(progress * 100)}
      style={{ opacity: progress >= 1 ? 0 : 1 }}
    >
      <div className="tf-progress-bar" style={{ transform: `scaleX(${progress})` }} />
    </div>
  );
}
