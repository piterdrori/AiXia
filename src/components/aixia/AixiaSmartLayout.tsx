import {
  Children,
  type CSSProperties,
  type HTMLAttributes,
  type ReactNode,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

type AixiaSmartLayoutSidebar = "normal" | "wide" | "narrow";
type AixiaSmartLayoutBalance = "normal" | "main" | "equal";

type AixiaSmartLayoutProps = HTMLAttributes<HTMLDivElement> & {
  main: ReactNode;
  side?: ReactNode;
  sidebar?: AixiaSmartLayoutSidebar;
  balance?: AixiaSmartLayoutBalance;
  matchColumns?: boolean;
};

function getChildCount(children: ReactNode) {
  return Children.toArray(children).filter(Boolean).length;
}

function getVisibleCardMinimumHeight(visibleCards: string | null) {
  if (visibleCards === "12") return 1580;
  if (visibleCards === "10") return 1340;

  return 1120;
}

function getColumnGap(element: HTMLElement) {
  const computedStyle = window.getComputedStyle(element);
  const rowGap = Number.parseFloat(computedStyle.rowGap || computedStyle.gap || "0");

  return Number.isFinite(rowGap) ? rowGap : 0;
}

function getColumnChildren(element: HTMLElement) {
  return Array.from(element.children).filter(
    (child): child is HTMLElement => child instanceof HTMLElement
  );
}

function shouldUseBottomSpan(mainChildren: ReactNode[], sideChildren: ReactNode[]) {
  return mainChildren.length > 1 && sideChildren.length > 0 && mainChildren.length > sideChildren.length;
}

export function AixiaSmartLayout({
  main,
  side,
  sidebar = "normal",
  balance = "normal",
  matchColumns = true,
  className = "",
  ...props
}: AixiaSmartLayoutProps) {
  const layoutRef = useRef<HTMLElement | null>(null);
  const mainRef = useRef<HTMLDivElement | null>(null);
  const sideRef = useRef<HTMLDivElement | null>(null);
  const [matchedFillHeight, setMatchedFillHeight] = useState<number | null>(null);

  const normalizedMainChildren = useMemo(() => {
    return Children.toArray(main).filter(Boolean);
  }, [main]);

  const normalizedSideChildren = useMemo(() => {
    return Children.toArray(side).filter(Boolean);
  }, [side]);

  const useBottomSpan = shouldUseBottomSpan(
    normalizedMainChildren,
    normalizedSideChildren
  );

  const mainColumnChildren = useBottomSpan
    ? normalizedMainChildren.slice(0, -1)
    : normalizedMainChildren;

  const bottomSpanChildren = useBottomSpan
    ? normalizedMainChildren.slice(-1)
    : [];

  useEffect(() => {
    if (!matchColumns) return;

    const layoutElement = layoutRef.current;
    const mainElement = mainRef.current;
    const sideElement = sideRef.current;

    if (!layoutElement || !mainElement || !sideElement) return;

    let frameId = 0;

    const updateMatchedHeight = () => {
      window.cancelAnimationFrame(frameId);

      frameId = window.requestAnimationFrame(() => {
        const fillSection = mainElement.querySelector<HTMLElement>(
          '.aixia-section-smart-scroll[data-fill="true"]'
        );

        if (!fillSection) {
          setMatchedFillHeight(null);
          return;
        }

        const sideHeight = sideElement.getBoundingClientRect().height;
        const mainChildren = getColumnChildren(mainElement);
        const columnGap = getColumnGap(mainElement);
        const visibleCards = fillSection.getAttribute("data-visible-cards");
        const minimumFillHeight = getVisibleCardMinimumHeight(visibleCards);

        const nonFillHeight = mainChildren.reduce((total, child) => {
          if (child === fillSection) return total;

          return total + child.getBoundingClientRect().height;
        }, 0);

        const gapsBeforeFill = Math.max(mainChildren.length - 1, 0) * columnGap;
        const availableOppositeHeight = sideHeight - nonFillHeight - gapsBeforeFill;
        const nextHeight = Math.max(minimumFillHeight, availableOppositeHeight);

        setMatchedFillHeight(
          Number.isFinite(nextHeight) && nextHeight > 0 ? Math.round(nextHeight) : null
        );
      });
    };

    updateMatchedHeight();

    const observer = new ResizeObserver(updateMatchedHeight);

    observer.observe(layoutElement);
    observer.observe(mainElement);
    observer.observe(sideElement);

    const fillSection = mainElement.querySelector<HTMLElement>(
      '.aixia-section-smart-scroll[data-fill="true"]'
    );

    if (fillSection) observer.observe(fillSection);

    window.addEventListener("resize", updateMatchedHeight);

    return () => {
      window.cancelAnimationFrame(frameId);
      observer.disconnect();
      window.removeEventListener("resize", updateMatchedHeight);
    };
  }, [matchColumns, main, side]);

  const style: CSSProperties = {
    ...props.style,
    ...(matchedFillHeight
      ? ({ "--aixia-smart-fill-height": `${matchedFillHeight}px` } as CSSProperties)
      : null),
  };

  return (
    <section
      ref={layoutRef}
      className={`aixia-smart-layout ${className}`}
      data-sidebar={sidebar === "normal" ? undefined : sidebar}
      data-balance={balance === "normal" ? undefined : balance}
      data-match-columns={matchColumns ? "true" : "false"}
      data-main-count={normalizedMainChildren.length}
      data-side-count={normalizedSideChildren.length}
      data-has-bottom-span={useBottomSpan ? "true" : "false"}
      style={style}
      {...props}
    >
      <div ref={mainRef} className="aixia-smart-main">
        {mainColumnChildren}
      </div>

      {side ? (
        <div ref={sideRef} className="aixia-smart-side">
          {normalizedSideChildren}
        </div>
      ) : null}

      {bottomSpanChildren.length > 0 ? (
        <div className="aixia-smart-bottom-span">{bottomSpanChildren}</div>
      ) : null}
    </section>
  );
}
