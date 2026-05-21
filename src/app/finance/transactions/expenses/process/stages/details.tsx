import {
  AixiaFieldLabel,
  AixiaFormFullWidth,
  AixiaFormGrid,
  AixiaSelectField,
  AixiaTextareaField,
} from "@/components/aixia";
import {
  REIMBURSEMENT_PAYMENT_METHODS,
  type ExpenseApplicationFormState,
} from "@/lib/finance/expenses/expenseApplicationTypes";

import { ExpenseTypeDetailsFields } from "./expense-type-details-fields";

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
      <ExpenseTypeDetailsFields form={form} updateField={updateField} />

      <AixiaFormFullWidth>
        <AixiaFieldLabel label="Business purpose / description" />
        <AixiaTextareaField
          value={form.description}
          onChange={(event) => updateField("description", event.target.value)}
          placeholder="Explain why this expense is needed"
        />
      </AixiaFormFullWidth>

      {form.expenseType === "reimbursement" ? (
        <>
          <AixiaFormFullWidth>
            <AixiaFieldLabel label="Reimbursement reason" required />
            <AixiaTextareaField
              value={form.reimbursementReason}
              onChange={(event) => updateField("reimbursementReason", event.target.value)}
              placeholder="Why should the company reimburse this expense?"
            />
          </AixiaFormFullWidth>
          <AixiaFormFullWidth>
            <AixiaFieldLabel label="How you paid" />
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
        <AixiaFieldLabel label="Internal notes" />
        <AixiaTextareaField
          value={form.notes}
          onChange={(event) => updateField("notes", event.target.value)}
          placeholder="Optional notes for Finance review"
        />
      </AixiaFormFullWidth>
    </AixiaFormGrid>
  );
}
