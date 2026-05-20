import { AixiaReviewGrid, AixiaValueBlock } from "@/components/aixia";
import {
  EXPENSE_MADE_BY_OPTIONS,
  EXPENSE_TYPE_OPTIONS,
  type CompanyRow,
  type EmployeeRefRow,
  type ExpenseApplicationFormState,
} from "@/lib/finance/expenses/expenseApplicationTypes";

function labelFor(
  options: { value: string; label: string }[],
  value: string,
) {
  return options.find((option) => option.value === value)?.label ?? value;
}

type ReviewSubmitStageProps = {
  form: ExpenseApplicationFormState;
  companies: CompanyRow[];
  employees: EmployeeRefRow[];
  documentationStatus: string;
};

export function ReviewSubmitStage({
  form,
  companies,
  employees,
  documentationStatus,
}: ReviewSubmitStageProps) {
  const companyName =
    companies.find((company) => company.id === form.companyId)?.name ?? "—";
  const employeeName =
    employees.find((employee) => employee.id === form.employeeRefId)?.code ?? "—";

  return (
    <AixiaReviewGrid>
      <AixiaValueBlock label="Expense Type" value={labelFor(EXPENSE_TYPE_OPTIONS, form.expenseType)} />
      <AixiaValueBlock label="Company" value={companyName} />
      <AixiaValueBlock
        label="Made By"
        value={labelFor(EXPENSE_MADE_BY_OPTIONS, form.expenseMadeByType)}
      />
      {form.expenseMadeByType === "employee" ? (
        <AixiaValueBlock label="Employee" value={employeeName} />
      ) : null}
      <AixiaValueBlock
        label="Amount"
        value={`${form.currencyCode} ${form.requestedAmount || "0.00"}`}
      />
      <AixiaValueBlock label="Expense Date" value={form.expenseDate || "—"} />
      <AixiaValueBlock label="Documentation" value={documentationStatus.replaceAll("_", " ")} />
      {form.description ? (
        <AixiaValueBlock label="Description" value={form.description} detail="Business purpose" />
      ) : null}
    </AixiaReviewGrid>
  );
}
