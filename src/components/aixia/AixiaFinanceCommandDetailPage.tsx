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

type AixiaFinanceCommandDetailPageHeroProps = {
  parentLabel?: string;
  parentPath?: string;
  gradientTitle: string;
  title: string;
  subtitle?: string;
  description?: string;
  /** Primary business KPIs — rendered in hero via AixiaCommandMetrics (never in meta strip). */
  metrics?: AixiaCommandMetricItem[];
  actions?: ReactNode;
  /** Optional hero body below metrics (e.g. workflow process pipeline). */
  extra?: ReactNode;
};

export type AixiaFinanceCommandDetailPageProps = {
  hero: AixiaFinanceCommandDetailPageHeroProps;
  /** Secondary operational/status/context signals only (system, access, record state). */
  metaStripItems?: AixiaFinanceHubMetaItem[];
  pageError?: string | null;
  /** Lifecycle / workflow actions below meta strip (when not placed in hero). */
  actionRow?: ReactNode;
  summarySection?: ReactNode;
  children: ReactNode;
};

/**
 * Global Finance equivalent-detail-page shell (locked standard; reference: payments-made/[id]).
 * Hero: primary business KPIs (AixiaCommandMetrics). Scroll body: meta strip → optional action row → summary → work.
 * See aixia-page-patterns.md — Locked — Finance transaction command header.
 */
export function AixiaFinanceCommandDetailPage({
  hero,
  metaStripItems = [],
  pageError,
  actionRow,
  summarySection,
  children,
}: AixiaFinanceCommandDetailPageProps) {
  const { metrics, extra, ...heroProps } = hero;

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
        {extra}
      </AixiaHero>

      <div className="aixia-command-scroll">
        {metaStripItems.length > 0 ? (
          <AixiaFinanceHubMetaStrip items={metaStripItems} />
        ) : null}

        {pageError ? <AixiaAlert tone="error">{pageError}</AixiaAlert> : null}

        {actionRow}
        {summarySection}
        {children}
      </div>
    </FinancePage>
  );
}
