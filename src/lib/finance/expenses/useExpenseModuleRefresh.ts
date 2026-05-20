import { useEffect } from "react";

import { supabase } from "@/lib/supabase";

type RefreshTable =
  | "finance_expenses"
  | "finance_approval_records"
  | "finance_expense_funding_batches"
  | "finance_expense_funding_batch_lines"
  | "finance_payments_made"
  | "finance_payment_made_expense_allocations"
  | "finance_record_attachments";

export type ExpenseModuleRefreshSubscription = {
  table: RefreshTable;
  filter?: string;
};

type UseExpenseModuleRefreshOptions = {
  channelName: string;
  tables: RefreshTable[] | ExpenseModuleRefreshSubscription[];
  onRefresh: () => void;
  intervalMs?: number;
  enabled?: boolean;
};

function normalizeSubscriptions(
  tables: RefreshTable[] | ExpenseModuleRefreshSubscription[],
): ExpenseModuleRefreshSubscription[] {
  return tables.map((entry) =>
    typeof entry === "string" ? { table: entry } : entry,
  );
}

export function useExpenseModuleRefresh({
  channelName,
  tables,
  onRefresh,
  intervalMs = 60000,
  enabled = true,
}: UseExpenseModuleRefreshOptions) {
  useEffect(() => {
    if (!enabled) return;

    let channel = supabase.channel(channelName);

    normalizeSubscriptions(tables).forEach(({ table, filter }) => {
      channel = channel.on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table,
          ...(filter ? { filter } : {}),
        },
        () => onRefresh(),
      );
    });

    channel.subscribe();

    const intervalId = window.setInterval(() => {
      onRefresh();
    }, intervalMs);

    return () => {
      window.clearInterval(intervalId);
      void supabase.removeChannel(channel);
    };
  }, [channelName, enabled, intervalMs, onRefresh, tables]);
}
