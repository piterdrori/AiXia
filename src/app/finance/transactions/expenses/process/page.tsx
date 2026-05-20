"use client";

import { useNavigate } from "react-router-dom";

import { AixiaButton, AixiaHero, FinancePage } from "@/components/aixia";
import { ExpenseApplicationWizard } from "@/components/finance/expenses/ExpenseApplicationWizard";

export default function FinanceExpenseProcessPage() {
  const navigate = useNavigate();

  return (
    <FinancePage>
      <AixiaHero
        className="shrink-0 space-y-4"
        surface="command"
        parentLabel="Expenses"
        parentPath="/finance/transactions/expenses"
        gradientTitle="Apply Expense"
        title="New expense"
        subtitle="Submit an expense or reimbursement request."
        actions={
          <AixiaButton
            type="button"
            variant="secondary"
            onClick={() => navigate("/finance/transactions/expenses")}
          >
            My expenses
          </AixiaButton>
        }
      />

      <div className="aixia-command-scroll">
        <ExpenseApplicationWizard />
      </div>
    </FinancePage>
  );
}
