import {
  Children,
  Fragment,
  type CSSProperties,
  type HTMLAttributes,
  type ReactNode,
  isValidElement,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

type AixiaSmartLayoutSidebar = "normal" | "wide" | "narrow";
type AixiaSmartLayoutBalance = "normal" | "main" | "equal";
type AixiaSmartLayoutBottomSpan = "auto" | "never" | "always";
type AixiaSmartLayoutSideRebalance = "off" | "last" | "last-to-bottom";

type AixiaSmartLayoutProps = HTMLAttributes<HTMLDivElement> & {
  main: ReactNode;
  side?: ReactNode;
  top?: ReactNode;
  sidebar?: AixiaSmartLayoutSidebar;
  balance?: AixiaSmartLayoutBalance;
  matchColumns?: boolean;
  bottomSpan?: AixiaSmartLayoutBottomSpan;
  sideRebalance?: AixiaSmartLayoutSideRebalance;
  mainTopCount?: number;
};

function flattenLayoutChildren(children: ReactNode): ReactNode[] {
  return Children.toArray(children)
    .flatMap((child) => {
      if (isValidElement(child) && child.type === Fragment) {
        return flattenLayoutChildren(
          (child.props as { children?: ReactNode }).children
        );
      }

      return child;
    })
    .filter(Boolean);
}

function getChildCount(children: ReactNode) {
  return flattenLayoutChildren(children).length;
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

function getResolvedMainTopCount({
  mainChildren,
  sideChildren,
  sideRebalance,
  mainTopCount,
}: {
  mainChildren: ReactNode[];
  sideChildren: ReactNode[];
  sideRebalance: AixiaSmartLayoutSideRebalance;
  mainTopCount?: number;
}) {
  if (
    typeof mainTopCount === "number" &&
    Number.isFinite(mainTopCount) &&
    mainTopCount > 0 &&
    mainTopCount < mainChildren.length
  ) {
    return mainTopCount;
  }

  if (
    sideRebalance === "last-to-bottom" &&
    mainChildren.length > 3 &&
    sideChildren.length > 1
  ) {
    return 3;
  }

  return undefined;
}

function shouldUseExplicitMainSplit(mainChildren: ReactNode[], mainTopCount?: number) {
  if (typeof mainTopCount !== "number") return false;
  if (!Number.isFinite(mainTopCount)) return false;

  return mainTopCount > 0 && mainTopCount < mainChildren.length;
}

function shouldUseBottomSpan(
  mainChildren: ReactNode[],
  sideChildren: ReactNode[],
  bottomSpan: AixiaSmartLayoutBottomSpan,
  sideRebalance: AixiaSmartLayoutSideRebalance,
  mainTopCount?: number
) {
  if (shouldUseExplicitMainSplit(mainChildren, mainTopCount)) {
    return true;
  }

  const shouldForceBottomSpanForRebalancedSide =
    sideRebalance === "last-to-bottom" &&
    mainChildren.length > 1 &&
    sideChildren.length > 1;

  if (shouldForceBottomSpanForRebalancedSide) {
    return true;
  }

  if (bottomSpan === "never") {
    return false;
  }

  if (bottomSpan === "always") {
    return mainChildren.length > 1 && sideChildren.length > 0;
  }

  return mainChildren.length > 1 && sideChildren.length > 0;
}

function shouldRebalanceSide(
  sideChildren: ReactNode[],
  sideRebalance: AixiaSmartLayoutSideRebalance
) {
  if (sideRebalance === "off") {
    return false;
  }

  return sideChildren.length > 1;
}

function getMainColumnChildren(
  mainChildren: ReactNode[],
  sideChildren: ReactNode[],
  bottomSpan: AixiaSmartLayoutBottomSpan,
  sideRebalance: AixiaSmartLayoutSideRebalance,
  mainTopCount?: number
) {
  if (shouldUseExplicitMainSplit(mainChildren, mainTopCount)) {
    return mainChildren.slice(0, mainTopCount);
  }

  if (
    shouldUseBottomSpan(
      mainChildren,
      sideChildren,
      bottomSpan,
      sideRebalance,
      mainTopCount
    )
  ) {
    return mainChildren.slice(0, -1);
  }

  return mainChildren;
}

function getBottomMainChildren(
  mainChildren: ReactNode[],
  sideChildren: ReactNode[],
  bottomSpan: AixiaSmartLayoutBottomSpan,
  sideRebalance: AixiaSmartLayoutSideRebalance,
  mainTopCount?: number
) {
  if (shouldUseExplicitMainSplit(mainChildren, mainTopCount)) {
    return mainChildren.slice(mainTopCount);
  }

  if (
    shouldUseBottomSpan(
      mainChildren,
      sideChildren,
      bottomSpan,
      sideRebalance,
      mainTopCount
    )
  ) {
    return mainChildren.slice(-1);
  }

  return [];
}

export function AixiaSmartLayout({
  main,
  side,
  top,
  sidebar = "normal",
  balance = "normal",
  matchColumns = true,
  bottomSpan = "auto",
  sideRebalance = "off",
  mainTopCount,
  className = "",
  ...props
}: AixiaSmartLayoutProps) {
  const layoutRef = useRef<HTMLElement | null>(null);
  const mainRef = useRef<HTMLDivElement | null>(null);
  const sideRef = useRef<HTMLDivElement | null>(null);
  const [matchedFillHeight, setMatchedFillHeight] = useState<number | null>(null);
  const [matchedMainTailHeight, setMatchedMainTailHeight] = useState<number | null>(null);

  const normalizedTopChildren = useMemo(() => {
    return flattenLayoutChildren(top);
  }, [top]);

  const normalizedMainChildren = useMemo(() => {
    return flattenLayoutChildren(main);
  }, [main]);

  const normalizedSideChildren = useMemo(() => {
    return flattenLayoutChildren(side);
  }, [side]);

  const resolvedMainTopCount = getResolvedMainTopCount({
    mainChildren: normalizedMainChildren,
    sideChildren: normalizedSideChildren,
    sideRebalance,
    mainTopCount,
  });

  const hasExplicitMainSplit = shouldUseExplicitMainSplit(
    normalizedMainChildren,
    resolvedMainTopCount
  );

  const useSideRebalance = shouldRebalanceSide(
    normalizedSideChildren,
    sideRebalance
  );

  const mainColumnChildren = getMainColumnChildren(
    normalizedMainChildren,
    normalizedSideChildren,
    bottomSpan,
    sideRebalance,
    resolvedMainTopCount
  );

  const bottomMainChildren = getBottomMainChildren(
    normalizedMainChildren,
    normalizedSideChildren,
    bottomSpan,
    sideRebalance,
    resolvedMainTopCount
  );

  const sideColumnChildren = useSideRebalance
    ? normalizedSideChildren.slice(0, -1)
    : normalizedSideChildren;

  const rebalancedSideChildren =
    sideRebalance === "last" ? normalizedSideChildren.slice(-1) : [];

  const bottomSideChildren =
    sideRebalance === "last-to-bottom" ? normalizedSideChildren.slice(-1) : [];

  const bottomSpanChildren = [
    ...bottomMainChildren,
    ...bottomSideChildren,
  ];

  useEffect(() => {
    if (!matchColumns && !hasExplicitMainSplit) return;

    const layoutElement = layoutRef.current;
    const mainElement = mainRef.current;
    const sideElement = sideRef.current;

    if (!layoutElement || !mainElement || !sideElement) return;

    let frameId = 0;

    const updateMatchedHeight = () => {
      window.cancelAnimationFrame(frameId);

      frameId = window.requestAnimationFrame(() => {
        const mainChildren = getColumnChildren(mainElement);
        const sideHeight = sideElement.getBoundingClientRect().height;
        const columnGap = getColumnGap(mainElement);

        const fillSection = mainElement.querySelector<HTMLElement>(
          '.aixia-section-smart-scroll[data-fill="true"]'
        );

        if (fillSection) {
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
            Number.isFinite(nextHeight) && nextHeight > 0
              ? Math.round(nextHeight)
              : null
          );
        } else {
          setMatchedFillHeight(null);
        }

        if (hasExplicitMainSplit && mainChildren.length > 0) {
          const tailWrapper = mainElement.querySelector<HTMLElement>(
            ".aixia-smart-main-top-tail"
          );

          if (!tailWrapper) {
            setMatchedMainTailHeight(null);
            return;
          }

          const naturalTailHeight = tailWrapper.getBoundingClientRect().height;

          const nonTailHeight = mainChildren.reduce((total, child) => {
            if (child === tailWrapper) return total;

            return total + child.getBoundingClientRect().height;
          }, 0);

          const gapsBeforeTail = Math.max(mainChildren.length - 1, 0) * columnGap;
          const availableTailHeight = sideHeight - nonTailHeight - gapsBeforeTail;
          const nextTailHeight = Math.max(naturalTailHeight, availableTailHeight);

          setMatchedMainTailHeight(
            Number.isFinite(nextTailHeight) && nextTailHeight > naturalTailHeight
              ? Math.round(nextTailHeight)
              : null
          );
        } else {
          setMatchedMainTailHeight(null);
        }
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

    const tailWrapper = mainElement.querySelector<HTMLElement>(
      ".aixia-smart-main-top-tail"
    );

    if (tailWrapper) observer.observe(tailWrapper);

    window.addEventListener("resize", updateMatchedHeight);

    return () => {
      window.cancelAnimationFrame(frameId);
      observer.disconnect();
      window.removeEventListener("resize", updateMatchedHeight);
    };
  }, [hasExplicitMainSplit, matchColumns, main, side]);

  const style: CSSProperties = {
    ...props.style,
    ...(matchedFillHeight
      ? ({ "--aixia-smart-fill-height": `${matchedFillHeight}px` } as CSSProperties)
      : null),
    ...(matchedMainTailHeight
      ? ({ "--aixia-smart-main-tail-height": `${matchedMainTailHeight}px` } as CSSProperties)
      : null),
  };

  return (
    <section
      ref={layoutRef}
      className={`aixia-smart-layout ${className}`}
      data-sidebar={sidebar === "normal" ? undefined : sidebar}
      data-balance={balance === "normal" ? undefined : balance}
      data-match-columns={matchColumns ? "true" : "false"}
      data-bottom-span-mode={bottomSpan}
      data-side-rebalance={sideRebalance}
      data-main-count={getChildCount(main)}
      data-side-count={getChildCount(side)}
      data-top-count={getChildCount(top)}
      data-main-top-count={mainColumnChildren.length}
      data-side-top-count={sideColumnChildren.length}
      data-side-rebalanced-count={rebalancedSideChildren.length}
      data-bottom-count={bottomSpanChildren.length}
      data-main-split-count={resolvedMainTopCount}
      data-has-top-span={normalizedTopChildren.length > 0 ? "true" : "false"}
      data-has-bottom-span={bottomSpanChildren.length > 0 ? "true" : "false"}
      data-has-side-rebalance={useSideRebalance ? "true" : "false"}
      data-has-explicit-main-split={
        shouldUseExplicitMainSplit(normalizedMainChildren, resolvedMainTopCount)
          ? "true"
          : "false"
      }
      style={style}
      {...props}
    >
      {normalizedTopChildren.length > 0 ? (
        <div className="aixia-smart-top-span">{normalizedTopChildren}</div>
      ) : null}

      <div ref={mainRef} className="aixia-smart-main">
        {hasExplicitMainSplit && mainColumnChildren.length > 0 ? (
          <>
            {mainColumnChildren.slice(0, -1)}
            <div className="aixia-smart-main-top-tail">
              {mainColumnChildren.slice(-1)}
            </div>
          </>
        ) : (
          mainColumnChildren
        )}

        {rebalancedSideChildren.length > 0 ? (
          <div className="aixia-smart-main-rebalanced-side">
            {rebalancedSideChildren}
          </div>
        ) : null}
      </div>

      {sideColumnChildren.length > 0 ? (
        <div ref={sideRef} className="aixia-smart-side">
          {sideColumnChildren}
        </div>
      ) : null}

      {bottomSpanChildren.length > 0 ? (
        <div className="aixia-smart-bottom-span">{bottomSpanChildren}</div>
      ) : null}
    </section>
  );
}
