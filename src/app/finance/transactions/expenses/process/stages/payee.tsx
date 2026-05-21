import {
  AixiaAlert,
  AixiaFieldLabel,
  AixiaFormFullWidth,
  AixiaFormGrid,
  AixiaSelectField,
} from "@/components/aixia";
import type { CompanyRow, ExpenseApplicationFormState } from "@/lib/finance/expenses/expenseApplicationTypes";

type PayeeStageProps = {
  form: ExpenseApplicationFormState;
  updateField: <Key extends keyof ExpenseApplicationFormState>(
    key: Key,
    value: ExpenseApplicationFormState[Key],
  ) => void;
  companies: CompanyRow[];
  employeeDisplayName: string;
  employeeSecondaryLabel?: string;
};

export function PayeeStage({
  form,
  updateField,
  companies,
  employeeDisplayName,
  employeeSecondaryLabel,
}: PayeeStageProps) {
  return (
    <AixiaFormGrid>
      <AixiaFormFullWidth>
        <AixiaAlert tone="info">
          This request is for you. Your name is recorded automatically — you only choose which
          company the expense belongs to.
        </AixiaAlert>
      </AixiaFormFullWidth>

      <AixiaFormFullWidth>
        <AixiaFieldLabel label="Employee" />
        <div className="rounded-xl border border-white/10 bg-black/20 px-4 py-3">
          <p className="text-sm font-semibold text-foreground">{employeeDisplayName}</p>
          {employeeSecondaryLabel ? (
            <p className="mt-1 text-xs text-muted-foreground">{employeeSecondaryLabel}</p>
          ) : null}
        </div>
      </AixiaFormFullWidth>

      <AixiaFormFullWidth>
        <AixiaFieldLabel label="Company" required />
        <AixiaSelectField
          value={form.companyId}
          onChange={(event) => updateField("companyId", event.target.value)}
        >
          <option value="">Select company</option>
          {companies.map((company) => (
            <option key={company.id} value={company.id}>
              {company.name || company.id}
            </option>
          ))}
        </AixiaSelectField>
      </AixiaFormFullWidth>
    </AixiaFormGrid>
  );
}
