import { supabase } from "@/lib/supabase";

export function subscribeToExpenses(onChange: () => void) {
  const channel = supabase
    .channel("finance-expenses")
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "finance_expenses" },
      () => onChange()
    )
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "finance_approval_records" },
      () => onChange()
    )
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "finance_reimbursements" },
      () => onChange()
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}
