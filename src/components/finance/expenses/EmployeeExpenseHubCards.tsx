import { Receipt, Wallet } from "lucide-react";

import { AixiaCommandMetrics, AixiaNavigationInfoPanel } from "@/components/aixia";
import {
  formatCurrencyTotals,
  type EmployeeExpenseMoneyStats,
} from "@/lib/finance/expenses/employeeStats";

type EmployeeExpenseHubCardsProps = {
  employeeName: string;
  stats: EmployeeExpenseMoneyStats;
};

export function EmployeeExpenseHubCards({ employeeName, stats }: EmployeeExpenseHubCardsProps) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <AixiaNavigationInfoPanel
        tone="cyan"
        icon={Receipt}
        title={employeeName}
        description="Your expense requests, receipts, and payment confirmations."
      />

      <AixiaNavigationInfoPanel
        tone="emerald"
        icon={Wallet}
        title="Money summary"
        description="Totals by currency — USD and CNY are never added together."
      >
        <AixiaCommandMetrics
          items={[
            {
              key: "received",
              title: "Received",
              value: formatCurrencyTotals(stats.receivedByCurrency),
              subtitle: "Confirmed in your account",
            },
            {
              key: "pending",
              title: "Pending",
              value: formatCurrencyTotals(stats.pendingByCurrency),
              subtitle: "Awaiting approval or payment",
            },
            {
              key: "spent",
              title: "Total paid out",
              value: formatCurrencyTotals(stats.paidOutByCurrency),
              subtitle: "Completed reimbursements",
            },
          ]}
        />
      </AixiaNavigationInfoPanel>
    </div>
  );
}
