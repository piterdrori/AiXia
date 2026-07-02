import type { ReactNode } from "react";

import "@/styles/finance/register-finance-bridge-styles";

import { AixiaAlert } from "./AixiaAlert";
import { AixiaCommandMetrics, type AixiaCommandMetricItem } from "./AixiaCommandMetrics";
import { AixiaHero } from "./AixiaHero";
import {
  AixiaFinanceHubMetaStrip,
  type AixiaFinanceHubMetaItem,
} from "./AixiaFinanceHubMetaStrip";
import { FinancePage } from "./FinancePage";

export type { AixiaCommandMetricItem, AixiaFinanceHubMetaItem };

type AixiaFinanceCommandCreatePageHeroProps = {
  parentLabel?: string;
  parentPath?: string;
  /** @deprecated Finance command create pages must not use hero badges — use metaStripItems. */
  badges?: React.ComponentProps<typeof AixiaHero>["badges"];
  /** @deprecated Always false on finance command create routes. */
  showBadges?: boolean;
  gradientTitle: string;
  title: string;
  subtitle?: string;
  description?: string;
  /** Primary business KPIs — rendered in hero via AixiaCommandMetrics (never in meta strip). */
  metrics?: AixiaCommandMetricItem[];
  actions?: ReactNode;
};

export type AixiaFinanceCommandCreatePageProps = {
  hero: AixiaFinanceCommandCreatePageHeroProps;
  /** Secondary operational/status/context signals only (system, access, record state). */
  metaStripItems?: AixiaFinanceHubMetaItem[];
  pageError?: string | null;
  pageMessage?: string | null;
  introAlert?: ReactNode;
  extraAlerts?: ReactNode;
  controlPanel?: ReactNode;
  summarySection?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
};

/**
 * Global Finance equivalent-create-page shell (locked standard; reference: paycheck-payments/new).
 * Hero: primary business KPIs (AixiaCommandMetrics). Scroll body: secondary meta strip only, then work.
 * See aixia-page-patterns.md — Locked — Finance transaction command header.
 */
export function AixiaFinanceCommandCreatePage({
  hero,
  metaStripItems = [],
  pageError,
  pageMessage,
  introAlert,
  extraAlerts,
  controlPanel,
  summarySection,
  children,
  footer,
}: AixiaFinanceCommandCreatePageProps) {
  const { metrics, badges: _badges, showBadges: _showBadges = false, ...heroProps } = hero;

  return (
    <FinancePage>
      <AixiaHero
        className="aixia-finance-command-hero"
        surface="command"
        {...heroProps}
      >
        {metrics && metrics.length > 0 ? (
          <AixiaCommandMetrics items={metrics} />
        ) : null}
      </AixiaHero>

      <div className="aixia-command-scroll">
        {metaStripItems.length > 0 ? (
          <AixiaFinanceHubMetaStrip items={metaStripItems} />
        ) : null}

        {pageError ? <AixiaAlert tone="error">{pageError}</AixiaAlert> : null}
        {pageMessage ? <AixiaAlert tone="success">{pageMessage}</AixiaAlert> : null}

        {introAlert}
        {extraAlerts}
        {controlPanel}
        {children}
        {summarySection}
        {footer}
      </div>
    </FinancePage>
  );
}
