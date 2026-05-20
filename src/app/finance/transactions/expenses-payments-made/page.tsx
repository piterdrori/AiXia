import { Navigate } from "react-router-dom";

export default function FinanceExpensePaymentsMadeRedirectPage() {
  return (
    <Navigate to="/finance/transactions/expense-review" replace />
  );
}
