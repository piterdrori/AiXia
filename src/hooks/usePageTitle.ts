import { useEffect } from "react";

/**
 * Sets document.title for analytics and browser tab; restores on unmount.
 */
export function usePageTitle(title: string, suffix = "AiXia") {
  useEffect(() => {
    const previous = document.title;
    document.title = suffix ? `${title} · ${suffix}` : title;
    return () => {
      document.title = previous;
    };
  }, [suffix, title]);
}
