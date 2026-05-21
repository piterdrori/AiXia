import {
  AixiaFieldLabel,
  AixiaFormFullWidth,
  AixiaInputField,
  AixiaSelectField,
  AixiaTextareaField,
} from "@/components/aixia";
import type { ExpenseApplicationFormState } from "@/lib/finance/expenses/expenseApplicationTypes";

type FieldUpdater = <Key extends keyof ExpenseApplicationFormState>(
  key: Key,
  value: ExpenseApplicationFormState[Key],
) => void;

type ExpenseTypeDetailsFieldsProps = {
  form: ExpenseApplicationFormState;
  updateField: FieldUpdater;
};

const TRAVEL_TYPES = [
  { value: "taxi", label: "Taxi" },
  { value: "train", label: "Train" },
  { value: "flight", label: "Flight" },
  { value: "hotel", label: "Hotel" },
  { value: "parking", label: "Parking" },
  { value: "other", label: "Other" },
];

const ONLINE_PLATFORMS = [
  { value: "amazon", label: "Amazon" },
  { value: "alibaba", label: "Alibaba" },
  { value: "taobao", label: "Taobao" },
  { value: "vendor_website", label: "Vendor Website" },
  { value: "other", label: "Other" },
];

const MEAL_TYPES = [
  { value: "business_meal", label: "Business Meal" },
  { value: "team_meal", label: "Team Meal" },
  { value: "client_meal", label: "Client Meal" },
  { value: "travel_meal", label: "Travel Meal" },
];

const UTILITY_TYPES = [
  { value: "electricity", label: "Electricity" },
  { value: "water", label: "Water" },
  { value: "internet", label: "Internet" },
  { value: "phone", label: "Phone" },
  { value: "other", label: "Other" },
];

export function ExpenseTypeDetailsFields({ form, updateField }: ExpenseTypeDetailsFieldsProps) {
  switch (form.expenseType) {
    case "travel":
      return (
        <>
          <AixiaFormFullWidth>
            <AixiaFieldLabel label="Travel type" required />
            <AixiaSelectField
              value={form.travelType}
              onChange={(event) => updateField("travelType", event.target.value)}
            >
              {TRAVEL_TYPES.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </AixiaSelectField>
          </AixiaFormFullWidth>
          <AixiaFormFullWidth>
            <AixiaFieldLabel label="From" required />
            <AixiaInputField
              value={form.travelFrom}
              onChange={(event) => updateField("travelFrom", event.target.value)}
              placeholder="Departure location"
            />
          </AixiaFormFullWidth>
          <AixiaFormFullWidth>
            <AixiaFieldLabel label="To" required />
            <AixiaInputField
              value={form.travelTo}
              onChange={(event) => updateField("travelTo", event.target.value)}
              placeholder="Destination"
            />
          </AixiaFormFullWidth>
          <AixiaFormFullWidth>
            <AixiaFieldLabel label="Travel date" required />
            <AixiaInputField
              type="date"
              value={form.travelDate}
              onChange={(event) => updateField("travelDate", event.target.value)}
            />
          </AixiaFormFullWidth>
          <AixiaFormFullWidth>
            <AixiaFieldLabel label="Travel reason" required />
            <AixiaTextareaField
              value={form.travelReason}
              onChange={(event) => updateField("travelReason", event.target.value)}
              placeholder="Why was this travel needed?"
            />
          </AixiaFormFullWidth>
        </>
      );

    case "online_shopping":
      return (
        <>
          <AixiaFormFullWidth>
            <AixiaFieldLabel label="Platform" required />
            <AixiaSelectField
              value={form.onlinePlatform}
              onChange={(event) => updateField("onlinePlatform", event.target.value)}
            >
              <option value="">Select platform</option>
              {ONLINE_PLATFORMS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </AixiaSelectField>
          </AixiaFormFullWidth>
          <AixiaFormFullWidth>
            <AixiaFieldLabel label="Order number" />
            <AixiaInputField
              value={form.onlineOrderNumber}
              onChange={(event) => updateField("onlineOrderNumber", event.target.value)}
            />
          </AixiaFormFullWidth>
          <AixiaFormFullWidth>
            <AixiaFieldLabel label="Order date" />
            <AixiaInputField
              type="date"
              value={form.onlineOrderDate}
              onChange={(event) => updateField("onlineOrderDate", event.target.value)}
            />
          </AixiaFormFullWidth>
        </>
      );

    case "meals":
      return (
        <>
          <AixiaFormFullWidth>
            <AixiaFieldLabel label="Restaurant / vendor" required />
            <AixiaInputField
              value={form.mealVendorName}
              onChange={(event) => updateField("mealVendorName", event.target.value)}
            />
          </AixiaFormFullWidth>
          <AixiaFormFullWidth>
            <AixiaFieldLabel label="Meal type" required />
            <AixiaSelectField
              value={form.mealType}
              onChange={(event) => updateField("mealType", event.target.value)}
            >
              {MEAL_TYPES.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </AixiaSelectField>
          </AixiaFormFullWidth>
          <AixiaFormFullWidth>
            <AixiaFieldLabel label="Meal date" required />
            <AixiaInputField
              type="date"
              value={form.mealDate}
              onChange={(event) => updateField("mealDate", event.target.value)}
            />
          </AixiaFormFullWidth>
        </>
      );

    case "utilities":
      return (
        <>
          <AixiaFormFullWidth>
            <AixiaFieldLabel label="Utility type" required />
            <AixiaSelectField
              value={form.utilityType}
              onChange={(event) => updateField("utilityType", event.target.value)}
            >
              {UTILITY_TYPES.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </AixiaSelectField>
          </AixiaFormFullWidth>
          <AixiaFormFullWidth>
            <AixiaFieldLabel label="Provider" required />
            <AixiaInputField
              value={form.utilityProviderName}
              onChange={(event) => updateField("utilityProviderName", event.target.value)}
            />
          </AixiaFormFullWidth>
        </>
      );

    case "software_subscription":
      return (
        <AixiaFormFullWidth>
          <AixiaFieldLabel label="Subscription / provider name" required />
          <AixiaInputField
            value={form.subscriptionProviderName}
            onChange={(event) => updateField("subscriptionProviderName", event.target.value)}
            placeholder="e.g. Microsoft 365, Slack"
          />
        </AixiaFormFullWidth>
      );

    case "repair_service":
      return (
        <>
          <AixiaFormFullWidth>
            <AixiaFieldLabel label="Service provider" required />
            <AixiaInputField
              value={form.repairProviderName}
              onChange={(event) => updateField("repairProviderName", event.target.value)}
            />
          </AixiaFormFullWidth>
          <AixiaFormFullWidth>
            <AixiaFieldLabel label="Issue description" required />
            <AixiaTextareaField
              value={form.repairIssueDescription}
              onChange={(event) => updateField("repairIssueDescription", event.target.value)}
            />
          </AixiaFormFullWidth>
        </>
      );

    case "other":
      return (
        <>
          <AixiaFormFullWidth>
            <AixiaFieldLabel label="Expense title" required />
            <AixiaInputField
              value={form.title}
              onChange={(event) => updateField("title", event.target.value)}
            />
          </AixiaFormFullWidth>
          <AixiaFormFullWidth>
            <AixiaFieldLabel label="Vendor / payee" required />
            <AixiaInputField
              value={form.expenseSourceName}
              onChange={(event) => updateField("expenseSourceName", event.target.value)}
            />
          </AixiaFormFullWidth>
        </>
      );

    default:
      return (
        <AixiaFormFullWidth>
          <AixiaFieldLabel label="Vendor / merchant" />
          <AixiaInputField
            value={form.expenseSourceName}
            onChange={(event) => updateField("expenseSourceName", event.target.value)}
            placeholder="Who did you pay or who will you pay?"
          />
        </AixiaFormFullWidth>
      );
  }
}
