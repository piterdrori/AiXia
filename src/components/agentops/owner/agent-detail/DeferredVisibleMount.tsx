import { useEffect, useRef, useState, type ReactNode } from "react";

type DeferredVisibleMountProps = {
  children: ReactNode;
  fallback?: ReactNode;
  /** Also mount after this delay even if still off-screen (keeps SEO/data available). */
  idleMountMs?: number;
  rootMargin?: string;
  testId?: string;
};

/**
 * D-E3 — defer heavy Agent Detail panels until near viewport (or short idle).
 * Keeps chat/status usable on first paint without dropping needed data.
 */
export function DeferredVisibleMount({
  children,
  fallback = null,
  idleMountMs = 400,
  rootMargin = "280px 0px",
  testId,
}: DeferredVisibleMountProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    if (mounted) return;
    const el = ref.current;
    let idleTimer: ReturnType<typeof setTimeout> | null = null;
    let observer: IntersectionObserver | null = null;

    const mount = () => setMounted(true);

    if (typeof IntersectionObserver !== "undefined" && el) {
      observer = new IntersectionObserver(
        (entries) => {
          if (entries.some((entry) => entry.isIntersecting)) {
            mount();
            observer?.disconnect();
          }
        },
        { rootMargin },
      );
      observer.observe(el);
    }

    idleTimer = setTimeout(mount, idleMountMs);

    return () => {
      observer?.disconnect();
      if (idleTimer) clearTimeout(idleTimer);
    };
  }, [mounted, idleMountMs, rootMargin]);

  return (
    <div ref={ref} data-testid={testId}>
      {mounted ? children : fallback}
    </div>
  );
}
