import {
  AixiaFieldLabel,
  AixiaFormFullWidth,
  AixiaFormGrid,
  AixiaSelectField,
} from "@/components/aixia";
import {
  EXPENSE_TYPE_OPTIONS,
  type ExpenseApplicationFormState,
} from "@/lib/finance/expenses/expenseApplicationTypes";

type ExpenseTypeStageProps = {
  form: ExpenseApplicationFormState;
  updateField: <Key extends keyof ExpenseApplicationFormState>(
    key: Key,
    value: ExpenseApplicationFormState[Key],
  ) => void;
};

export function ExpenseTypeStage({ form, updateField }: ExpenseTypeStageProps) {
  return (
    <AixiaFormGrid>
      <AixiaFormFullWidth>
        <AixiaFieldLabel label="Expense Type" required />
        <AixiaSelectField
          value={form.expenseType}
          onChange={(event) => updateField("expenseType", event.target.value)}
        >
          {EXPENSE_TYPE_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </AixiaSelectField>
      </AixiaFormFullWidth>
      {form.expenseType === "reimbursement" ? (
        <AixiaFormFullWidth>
          <p className="text-sm text-[var(--aixia-text-muted)]">
            Reimbursements are for money you already spent. You will upload proof in a later
            step before submitting.
          </p>
        </AixiaFormFullWidth>
      ) : null}
    </AixiaFormGrid>
  );
}
