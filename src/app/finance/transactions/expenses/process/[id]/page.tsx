"use client";

import { useNavigate, useParams } from "react-router-dom";

import { AixiaButton, AixiaHero, FinancePage } from "@/components/aixia";
import { ExpenseApplicationWizard } from "@/components/finance/expenses/ExpenseApplicationWizard";

export default function FinanceExpenseProcessDetailPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();

  return (
    <FinancePage>
      <AixiaHero
        className="shrink-0 space-y-4"
        surface="command"
        parentLabel="Expenses"
        parentPath="/finance/transactions/expenses"
        gradientTitle="Apply Expense"
        title="Continue expense"
        subtitle="Pick up where you left off and submit when ready."
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
        {id ? <ExpenseApplicationWizard expenseId={id} /> : null}
      </div>
    </FinancePage>
  );
}
