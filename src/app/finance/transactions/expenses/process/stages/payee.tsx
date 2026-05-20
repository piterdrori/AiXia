import {
  AixiaFieldLabel,
  AixiaFormFullWidth,
  AixiaFormGrid,
  AixiaInputField,
  AixiaSelectField,
  AixiaTextareaField,
} from "@/components/aixia";
import {
  EXPENSE_MADE_BY_OPTIONS,
  type CompanyRow,
  type EmployeeRefRow,
  type ExpenseApplicationFormState,
} from "@/lib/finance/expenses/expenseApplicationTypes";
import {
  getFinanceEmployeePrimaryName,
  type FinanceEmployeeIdentity,
} from "@/lib/finance/employeeIdentity";

type PayeeStageProps = {
  form: ExpenseApplicationFormState;
  updateField: <Key extends keyof ExpenseApplicationFormState>(
    key: Key,
    value: ExpenseApplicationFormState[Key],
  ) => void;
  companies: CompanyRow[];
  employees: EmployeeRefRow[];
  employeeIdentities: FinanceEmployeeIdentity[];
};

export function PayeeStage({
  form,
  updateField,
  companies,
  employees,
  employeeIdentities,
}: PayeeStageProps) {
  const employeeIdentityByRefId = new Map(
    employeeIdentities.map((identity) => [
      String(identity.employee_ref_id ?? identity.id ?? ""),
      identity,
    ]),
  );
  const employeeIdentityByUserId = new Map(
    employeeIdentities.map((identity) => [String(identity.user_id ?? ""), identity]),
  );

  return (
    <AixiaFormGrid>
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

      <AixiaFormFullWidth>
        <AixiaFieldLabel label="Expense Made By" required />
        <AixiaSelectField
          value={form.expenseMadeByType}
          onChange={(event) =>
            updateField(
              "expenseMadeByType",
              event.target.value as ExpenseApplicationFormState["expenseMadeByType"],
            )
          }
        >
          {EXPENSE_MADE_BY_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </AixiaSelectField>
      </AixiaFormFullWidth>

      {form.expenseMadeByType === "employee" ? (
        <AixiaFormFullWidth>
          <AixiaFieldLabel label="Employee / Payee" required />
          <AixiaSelectField
            value={form.employeeRefId}
            onChange={(event) => updateField("employeeRefId", event.target.value)}
          >
            <option value="">Select employee</option>
            {employees.map((employee) => (
              <option key={employee.id} value={employee.id}>
                {getFinanceEmployeePrimaryName(
                  employeeIdentityByRefId.get(employee.id) ??
                    employeeIdentityByUserId.get(employee.user_id) ??
                    null,
                  employee.code || employee.id,
                )}
              </option>
            ))}
          </AixiaSelectField>
        </AixiaFormFullWidth>
      ) : null}

      {form.expenseMadeByType === "owner_management" ? (
        <AixiaFormFullWidth>
          <AixiaFieldLabel label="Responsible Person" required />
          <AixiaInputField
            value={form.responsiblePersonName}
            onChange={(event) => updateField("responsiblePersonName", event.target.value)}
            placeholder="Name of owner or manager"
          />
        </AixiaFormFullWidth>
      ) : null}

      {form.expenseMadeByType === "other" ? (
        <AixiaFormFullWidth>
          <AixiaFieldLabel label="Other Explanation" required />
          <AixiaTextareaField
            value={form.otherMadeByExplanation}
            onChange={(event) => updateField("otherMadeByExplanation", event.target.value)}
            placeholder="Explain who made this expense"
          />
        </AixiaFormFullWidth>
      ) : null}
    </AixiaFormGrid>
  );
}
