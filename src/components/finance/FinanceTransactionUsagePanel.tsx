import { useEffect, useState } from "react";
import { Link2, Loader2 } from "lucide-react";

import { AixiaEmptyState, AixiaReviewBlock, AixiaReviewGrid, AixiaSection } from "@/components/aixia";
import {
  fetchEntityTransactionUsage,
  type EntityTransactionUsageKind,
  type EntityTransactionUsageResult,
} from "@/lib/finance/transactionUsage/fetchEntityTransactionUsage";

type FinanceTransactionUsagePanelProps = {
  entityKind: EntityTransactionUsageKind;
  entityId: string | null | undefined;
  title?: string;
  description?: string;
};

export function FinanceTransactionUsagePanel({
  entityKind,
  entityId,
  title = "Transaction Usage",
  description = "Linked finance documents for this master-data record.",
}: FinanceTransactionUsagePanelProps) {
  const [usage, setUsage] = useState<EntityTransactionUsageResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!entityId) {
      setUsage(null);
      return;
    }

    let cancelled = false;

    const loadUsage = async () => {
      setIsLoading(true);

      try {
        const result = await fetchEntityTransactionUsage(entityKind, entityId);
        if (!cancelled) {
          setUsage(result);
        }
      } catch (error) {
        console.error("Failed to load entity transaction usage:", error);
        if (!cancelled) {
          setUsage(null);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    void loadUsage();

    return () => {
      cancelled = true;
    };
  }, [entityId, entityKind]);

  return (
    <AixiaSection title={title} description={description} icon={Link2}>
      {isLoading ? (
        <MotionlessLoading />
      ) : !entityId ? (
        <AixiaEmptyState
          icon={Link2}
          title="No record selected"
          description="Transaction usage appears after the record loads."
        />
      ) : !usage || usage.counts.length === 0 ? (
        <AixiaEmptyState
          icon={Link2}
          title="No linked documents"
          description="No finance documents are linked to this record yet."
        />
      ) : (
        <AixiaReviewGrid variant="compact">
          {usage.counts.map((row) => (
            <AixiaReviewBlock
              key={row.key}
              label={row.label}
              value={row.count.toLocaleString()}
              description={
                row.count === 1 ? "1 linked document" : `${row.count} linked documents`
              }
            />
          ))}
          <AixiaReviewBlock
            label="Total Linked"
            value={usage.totalLinked.toLocaleString()}
            description="Across visible finance document types."
          />
        </AixiaReviewGrid>
      )}
    </AixiaSection>
  );
}

function MotionlessLoading() {
  return (
    <div className="aixia-inline-loading">
      <Loader2 className="h-4 w-4 animate-spin" />
      <span>Loading linked documents...</span>
    </div>
  );
}
