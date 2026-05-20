import {
  AixiaFieldLabel,
  AixiaFormFullWidth,
  AixiaFormGrid,
  AixiaInputField,
  AixiaSelectField,
  AixiaTextareaField,
} from "@/components/aixia";
import {
  REIMBURSEMENT_PAYMENT_METHODS,
  type ExpenseApplicationFormState,
} from "@/lib/finance/expenses/expenseApplicationTypes";

type DetailsStageProps = {
  form: ExpenseApplicationFormState;
  updateField: <Key extends keyof ExpenseApplicationFormState>(
    key: Key,
    value: ExpenseApplicationFormState[Key],
  ) => void;
};

export function DetailsStage({ form, updateField }: DetailsStageProps) {
  return (
    <AixiaFormGrid>
      {form.expenseType === "other" ? (
        <>
          <AixiaFormFullWidth>
            <AixiaFieldLabel label="Expense Title" required />
            <AixiaInputField
              value={form.title}
              onChange={(event) => updateField("title", event.target.value)}
              placeholder="Short title for this expense"
            />
          </AixiaFormFullWidth>
          <AixiaFormFullWidth>
            <AixiaFieldLabel label="Expense Source" required />
            <AixiaInputField
              value={form.expenseSourceName}
              onChange={(event) => updateField("expenseSourceName", event.target.value)}
              placeholder="Vendor, merchant, or payee name"
            />
          </AixiaFormFullWidth>
        </>
      ) : null}

      <AixiaFormFullWidth>
        <AixiaFieldLabel label="Business Purpose / Description" />
        <AixiaTextareaField
          value={form.description}
          onChange={(event) => updateField("description", event.target.value)}
          placeholder="Explain why this expense is needed"
        />
      </AixiaFormFullWidth>

      {form.expenseType === "reimbursement" ? (
        <>
          <AixiaFormFullWidth>
            <AixiaFieldLabel label="Reimbursement Reason" required />
            <AixiaTextareaField
              value={form.reimbursementReason}
              onChange={(event) => updateField("reimbursementReason", event.target.value)}
              placeholder="Why should the company reimburse this expense?"
            />
          </AixiaFormFullWidth>
          <AixiaFormFullWidth>
            <AixiaFieldLabel label="How You Paid" />
            <AixiaSelectField
              value={form.reimbursementPaymentMethod}
              onChange={(event) =>
                updateField("reimbursementPaymentMethod", event.target.value)
              }
            >
              {REIMBURSEMENT_PAYMENT_METHODS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </AixiaSelectField>
          </AixiaFormFullWidth>
        </>
      ) : null}

      <AixiaFormFullWidth>
        <AixiaFieldLabel label="Internal Notes" />
        <AixiaTextareaField
          value={form.notes}
          onChange={(event) => updateField("notes", event.target.value)}
          placeholder="Optional notes for Finance review"
        />
      </AixiaFormFullWidth>
    </AixiaFormGrid>
  );
}
