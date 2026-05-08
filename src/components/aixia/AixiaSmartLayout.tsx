import {
  Children,
  type CSSProperties,
  type HTMLAttributes,
  type ReactNode,
  useEffect,
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

function resetAutoBalancedChildren(children: HTMLElement[]) {
  children.forEach((child) => {
    child.style.removeProperty("--aixia-smart-auto-extra-height");
    child.style.removeProperty("--aixia-smart-auto-min-height");
    child.removeAttribute("data-smart-auto-fill");
    child.removeAttribute("data-smart-row-matched");
  });
}

function getColumnNaturalHeight(element: HTMLElement) {
  const children = getColumnChildren(element);
  const columnGap = getColumnGap(element);

  return children.reduce((total, child, index) => {
    const childHeight = child.getBoundingClientRect().height;
    const gap = index > 0 ? columnGap : 0;

    return total + childHeight + gap;
  }, 0);
}

function getLastStretchableChild(children: HTMLElement[]) {
  const reversedChildren = [...children].reverse();

  return (
    reversedChildren.find((child) => {
      const computedStyle = window.getComputedStyle(child);
      const rect = child.getBoundingClientRect();

      return computedStyle.display !== "none" && rect.height > 0;
    }) || null
  );
}

function applyMatchedRows(mainChildren: HTMLElement[], sideChildren: HTMLElement[]) {
  const pairedCount = Math.min(mainChildren.length, sideChildren.length);

  if (pairedCount <= 0) return;

  for (let index = 0; index < pairedCount; index += 1) {
    const mainChild = mainChildren[index];
    const sideChild = sideChildren[index];

    if (!mainChild || !sideChild) continue;

    const mainHeight = mainChild.getBoundingClientRect().height;
    const sideHeight = sideChild.getBoundingClientRect().height;
    const targetHeight = Math.max(mainHeight, sideHeight);

    if (!Number.isFinite(targetHeight) || targetHeight <= 0) continue;

    mainChild.style.setProperty(
      "--aixia-smart-auto-min-height",
      `${Math.round(targetHeight)}px`
    );
    sideChild.style.setProperty(
      "--aixia-smart-auto-min-height",
      `${Math.round(targetHeight)}px`
    );

    mainChild.setAttribute("data-smart-row-matched", "true");
    sideChild.setAttribute("data-smart-row-matched", "true");
  }
}

function applyColumnFill(mainElement: HTMLElement, sideElement: HTMLElement) {
  const mainHeight = getColumnNaturalHeight(mainElement);
  const sideHeight = getColumnNaturalHeight(sideElement);
  const targetHeight = Math.max(mainHeight, sideHeight);

  if (!Number.isFinite(targetHeight) || targetHeight <= 0) return;

  const shorterElement = mainHeight < sideHeight ? mainElement : sideElement;
  const shorterChildren = getColumnChildren(shorterElement);
  const fillChild = getLastStretchableChild(shorterChildren);

  if (!fillChild) return;

  const shorterHeight = shorterElement === mainElement ? mainHeight : sideHeight;
  const extraHeight = Math.max(0, targetHeight - shorterHeight);

  if (extraHeight <= 1) return;

  fillChild.style.setProperty(
    "--aixia-smart-auto-extra-height",
    `${Math.round(extraHeight)}px`
  );
  fillChild.setAttribute("data-smart-auto-fill", "true");
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
        const mainChildren = getColumnChildren(mainElement);
        const sideChildren = getColumnChildren(sideElement);

        resetAutoBalancedChildren(mainChildren);
        resetAutoBalancedChildren(sideChildren);

        const isDesktopLayout = window.matchMedia("(min-width: 1280px)").matches;

        if (isDesktopLayout) {
          applyMatchedRows(mainChildren, sideChildren);
          applyColumnFill(mainElement, sideElement);
        }

        const fillSection = mainElement.querySelector<HTMLElement>(
          '.aixia-section-smart-scroll[data-fill="true"]'
        );

        if (!fillSection) {
          setMatchedFillHeight(null);
          return;
        }

        const sideHeight = sideElement.getBoundingClientRect().height;
        const refreshedMainChildren = getColumnChildren(mainElement);
        const columnGap = getColumnGap(mainElement);
        const visibleCards = fillSection.getAttribute("data-visible-cards");
        const minimumFillHeight = getVisibleCardMinimumHeight(visibleCards);

        const nonFillHeight = refreshedMainChildren.reduce((total, child) => {
          if (child === fillSection) return total;

          return total + child.getBoundingClientRect().height;
        }, 0);

        const gapsBeforeFill =
          Math.max(refreshedMainChildren.length - 1, 0) * columnGap;
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

    getColumnChildren(mainElement).forEach((child) => observer.observe(child));
    getColumnChildren(sideElement).forEach((child) => observer.observe(child));

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
      data-main-count={getChildCount(main)}
      data-side-count={getChildCount(side)}
      style={style}
      {...props}
    >
      <div ref={mainRef} className="aixia-smart-main">
        {main}
      </div>

      {side ? (
        <div ref={sideRef} className="aixia-smart-side">
          {side}
        </div>
      ) : null}
    </section>
  );
}
