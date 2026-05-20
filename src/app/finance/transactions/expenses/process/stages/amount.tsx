import {
  AixiaFieldLabel,
  AixiaFormField,
  AixiaFormFullWidth,
  AixiaFormGrid,
  AixiaInputField,
  AixiaSelectField,
} from "@/components/aixia";
import type {
  CurrencyRow,
  ExpenseApplicationFormState,
} from "@/lib/finance/expenses/expenseApplicationTypes";

type AmountStageProps = {
  form: ExpenseApplicationFormState;
  updateField: <Key extends keyof ExpenseApplicationFormState>(
    key: Key,
    value: ExpenseApplicationFormState[Key],
  ) => void;
  currencies: CurrencyRow[];
};

export function AmountStage({ form, updateField, currencies }: AmountStageProps) {
  return (
    <AixiaFormGrid>
      <AixiaFormField>
        <AixiaFieldLabel label="Requested Amount" required />
        <AixiaInputField
          type="number"
          min="0"
          step="0.01"
          value={form.requestedAmount}
          onChange={(event) => updateField("requestedAmount", event.target.value)}
          placeholder="0.00"
        />
      </AixiaFormField>

      <AixiaFormField>
        <AixiaFieldLabel label="Currency" required />
        <AixiaSelectField
          value={form.currencyCode}
          onChange={(event) => updateField("currencyCode", event.target.value)}
        >
          {currencies.map((currency) => (
            <option key={currency.id} value={currency.currency_code}>
              {currency.currency_code} — {currency.currency_name}
            </option>
          ))}
        </AixiaSelectField>
      </AixiaFormField>

      <AixiaFormField>
        <AixiaFieldLabel label="Expense Date" required />
        <AixiaInputField
          type="date"
          value={form.expenseDate}
          onChange={(event) => updateField("expenseDate", event.target.value)}
        />
      </AixiaFormField>

      <AixiaFormFullWidth>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={form.isRetroactive}
            onChange={(event) => updateField("isRetroactive", event.target.checked)}
          />
          This is a retroactive expense (already occurred)
        </label>
      </AixiaFormFullWidth>

      {form.isRetroactive ? (
        <AixiaFormFullWidth>
          <AixiaFieldLabel label="Retroactive Reason" required />
          <AixiaInputField
            value={form.retroactiveReason}
            onChange={(event) => updateField("retroactiveReason", event.target.value)}
            placeholder="Why is this being submitted after the fact?"
          />
        </AixiaFormFullWidth>
      ) : null}
    </AixiaFormGrid>
  );
}
