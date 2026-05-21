import type { FinanceEmployeeIdentity } from "@/lib/finance/employeeIdentity";
import {
  getFinanceEmployeePrimaryName,
  getFinanceEmployeeReferenceLabel,
  getFinanceEmployeeSecondaryLabel,
} from "@/lib/finance/employeeIdentity";
import { supabase } from "@/lib/supabase";

import type {
  CompanyRow,
  CurrencyRow,
  EmployeeRefRow,
  ExpenseApplicationFormState,
} from "./expenseApplicationTypes";
import {
  EXPENSE_TYPE_OPTIONS,
  REIMBURSEMENT_PAYMENT_METHODS,
} from "./expenseApplicationTypes";

function buildExpenseNumber() {
  const datePart = new Date().toISOString().slice(0, 10).replaceAll("-", "");
  const randomPart =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID().slice(0, 8).toUpperCase()
      : Math.random().toString(36).slice(2, 10).toUpperCase();

  return `EXP-${datePart}-${randomPart}`;
}

function toAmount(value: string) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function getOptionLabel(
  options: { value: string; label: string }[],
  value: string,
  otherValue?: string,
) {
  if (value === "other") return otherValue?.trim() || "Other";
  return options.find((option) => option.value === value)?.label || value || "Not selected";
}

function buildExpenseTypeDetailsMetadata(form: ExpenseApplicationFormState) {
  switch (form.expenseType) {
    case "travel":
      return {
        travel: {
          travel_type: form.travelType,
          from: form.travelFrom.trim(),
          to: form.travelTo.trim(),
          travel_date: form.travelDate || null,
          reason: form.travelReason.trim(),
        },
      };
    case "online_shopping":
      return {
        online_shopping: {
          platform: form.onlinePlatform,
          order_number: form.onlineOrderNumber.trim() || null,
          order_date: form.onlineOrderDate || null,
        },
      };
    case "meals":
      return {
        meals: {
          vendor_name: form.mealVendorName.trim(),
          meal_type: form.mealType,
          meal_date: form.mealDate || null,
        },
      };
    case "utilities":
      return {
        utilities: {
          utility_type: form.utilityType,
          provider_name: form.utilityProviderName.trim(),
        },
      };
    case "software_subscription":
      return {
        software_subscription: {
          provider_name: form.subscriptionProviderName.trim(),
        },
      };
    case "repair_service":
      return {
        repair_service: {
          provider_name: form.repairProviderName.trim(),
          issue_description: form.repairIssueDescription.trim(),
        },
      };
    default:
      return {};
  }
}

function resolveMimeType(file: File) {
  if (file.type && file.type !== "application/octet-stream") return file.type;
  const extension = file.name.split(".").pop()?.toLowerCase();
  switch (extension) {
    case "pdf":
      return "application/pdf";
    case "png":
      return "image/png";
    case "jpg":
    case "jpeg":
      return "image/jpeg";
    default:
      return file.type || "application/octet-stream";
  }
}

export type SaveExpenseApplicationInput = {
  form: ExpenseApplicationFormState;
  documentationFile: File | null;
  documentationStatus: string;
  submitMode: "draft" | "request";
  companies: CompanyRow[];
  employees: EmployeeRefRow[];
  employeeIdentities: FinanceEmployeeIdentity[];
  currencies: CurrencyRow[];
  intakeContext?: string;
};

export function validateExpenseApplicationForm(
  input: SaveExpenseApplicationInput,
): string | null {
  const { form, documentationStatus, submitMode } = input;
  const amountValue = toAmount(form.requestedAmount);
  const isReimbursementType = form.expenseType === "reimbursement";

  if (form.expenseType === "other" && !form.title.trim()) {
    return "Expense title is required when Expense Type is Other.";
  }
  if (!form.companyId) return "Company is required.";
  if (!form.expenseDate) return "Expected expense date is required.";
  if (!form.expenseType) return "Expense type is required.";
  if (!form.currencyCode) return "Currency is required.";
  if (submitMode === "request" && amountValue <= 0) {
    return "Requested amount must be greater than zero.";
  }
  if (!form.employeeRefId) {
    return "Your employee profile must be linked before submitting.";
  }
  if (
    form.expenseMadeByType === "owner_management" &&
    !form.responsiblePersonName.trim()
  ) {
    return "Responsible person name is required for Owner / Management expenses.";
  }
  if (isReimbursementType && submitMode === "request" && !form.reimbursementReason.trim()) {
    return "Reimbursement reason is required.";
  }
  if (
    submitMode === "request" &&
    isReimbursementType &&
    documentationStatus === "missing"
  ) {
    return "Reimbursement requests need proof upload or documentation link.";
  }
  if (form.isRetroactive && submitMode === "request" && !form.retroactiveReason.trim()) {
    return "Retroactive reason is required.";
  }

  return null;
}

export function validateExpenseWizardStage(
  stageId: string,
  input: SaveExpenseApplicationInput,
): string | null {
  const { form } = input;

  switch (stageId) {
    case "expense-type":
      return form.expenseType ? null : "Choose an expense type.";
    case "payee":
      if (!form.companyId) return "Company is required.";
      if (!form.employeeRefId) return "Your employee profile could not be linked. Contact Finance.";
      return null;
    case "details":
      if (form.expenseType === "reimbursement" && !form.reimbursementReason.trim()) {
        return "Reimbursement reason is required.";
      }
      if (form.expenseType === "other" && !form.title.trim()) {
        return "Title is required for Other expense type.";
      }
      if (form.expenseType === "other" && !form.expenseSourceName.trim()) {
        return "Vendor is required for Other expense type.";
      }
      if (form.expenseType === "travel") {
        if (!form.travelFrom.trim()) return "Travel from is required.";
        if (!form.travelTo.trim()) return "Travel to is required.";
        if (!form.travelDate) return "Travel date is required.";
        if (!form.travelReason.trim()) return "Travel reason is required.";
      }
      if (form.expenseType === "online_shopping" && !form.onlinePlatform) {
        return "Platform is required for online shopping.";
      }
      if (form.expenseType === "meals" && !form.mealVendorName.trim()) {
        return "Restaurant / vendor is required for meals.";
      }
      if (form.expenseType === "utilities" && !form.utilityProviderName.trim()) {
        return "Utility provider is required.";
      }
      if (form.expenseType === "software_subscription" && !form.subscriptionProviderName.trim()) {
        return "Subscription provider name is required.";
      }
      if (form.expenseType === "repair_service") {
        if (!form.repairProviderName.trim()) return "Service provider is required.";
        if (!form.repairIssueDescription.trim()) return "Issue description is required.";
      }
      return null;
    case "amount":
      if (!form.currencyCode) return "Currency is required.";
      if (!form.expenseDate) return "Expense date is required.";
      if (toAmount(form.requestedAmount) <= 0) return "Enter a valid amount.";
      return null;
    case "receipts":
      return null;
    case "review-submit":
      return validateExpenseApplicationForm({ ...input, submitMode: "request" });
    default:
      return null;
  }
}

async function uploadDocumentation(
  expenseId: string,
  expenseNumber: string,
  userId: string | null,
  documentationFile: File,
) {
  const resolvedMimeType = resolveMimeType(documentationFile);
  const safeFileName = documentationFile.name.replace(/[^\w.\-]+/g, "_");
  const filePath = `${expenseId}/${Date.now()}-${safeFileName}`;

  const uploadResult = await supabase.storage
    .from("finance-expense-documents")
    .upload(filePath, documentationFile, {
      contentType: resolvedMimeType,
      upsert: false,
    });

  if (uploadResult.error) throw uploadResult.error;

  const fileUploadResult = await supabase
    .from("file_uploads")
    .insert({
      user_id: userId,
      file_name: documentationFile.name,
      file_path: uploadResult.data.path,
      file_size: documentationFile.size,
      mime_type: resolvedMimeType,
      entity_type: "finance_expense",
      created_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (fileUploadResult.error) throw fileUploadResult.error;

  const attachmentResult = await supabase.from("finance_record_attachments").insert({
    entity_type: "finance_expense",
    entity_id: expenseId,
    file_upload_id: fileUploadResult.data.id,
    uploaded_by: userId,
    notes: `Documentation for ${expenseNumber}`,
    metadata: {
      bucket: "finance-expense-documents",
      uploaded_from: "expenses_process_wizard",
      resolved_mime_type: resolvedMimeType,
    },
  });

  if (attachmentResult.error) throw attachmentResult.error;
}

export async function saveExpenseApplication(
  input: SaveExpenseApplicationInput,
): Promise<{ id: string; expense_number: string | null }> {
  const validationError = validateExpenseApplicationForm(input);
  if (validationError) throw new Error(validationError);

  const { form, documentationFile, documentationStatus, submitMode, companies, employees, employeeIdentities, currencies, intakeContext } =
    input;

  const authResult = await supabase.auth.getUser();
  if (authResult.error) throw authResult.error;

  const userId = authResult.data.user?.id ?? null;
  const isReimbursementType = form.expenseType === "reimbursement";
  const amountValue = toAmount(form.requestedAmount);
  const selectedCompany = companies.find((company) => company.id === form.companyId) ?? null;
  const selectedEmployee = employees.find((employee) => employee.id === form.employeeRefId) ?? null;
  const selectedCurrency =
    currencies.find((currency) => currency.currency_code === form.currencyCode) ??
    currencies.find((currency) => currency.is_base_currency) ??
    currencies[0] ??
    null;

  const employeeIdentityMap = new Map<string, FinanceEmployeeIdentity>();
  employeeIdentities.forEach((identity) => {
    const employeeRefId = identity.employee_ref_id || identity.id;
    if (employeeRefId) employeeIdentityMap.set(employeeRefId, identity);
    if (identity.user_id) employeeIdentityMap.set(identity.user_id, identity);
  });

  const selectedEmployeeIdentity = selectedEmployee
    ? employeeIdentityMap.get(selectedEmployee.id) ?? null
    : null;

  const expenseTypeLabel = getOptionLabel(
    EXPENSE_TYPE_OPTIONS,
    form.expenseType,
    form.otherExpenseExplanation,
  );

  const finalExpenseTitle =
    form.expenseType === "other"
      ? form.title.trim()
      : `${expenseTypeLabel}${form.description.trim() ? ` — ${form.description.trim().slice(0, 80)}` : ""}`;

  const finalExpenseSource =
    form.expenseType === "other"
      ? form.expenseSourceName.trim()
      : expenseTypeLabel;
  const hasProofAtSubmit =
    documentationStatus !== "missing" ||
    Boolean(documentationFile) ||
    Boolean(form.externalDocumentationLink.trim());

  const requestStatus =
    submitMode === "request"
      ? isReimbursementType
        ? "documentation_submitted"
        : hasProofAtSubmit
          ? "documentation_submitted"
          : "requested"
      : "draft";

  const metadata = {
    expense_request_type: isReimbursementType ? "reimbursement" : "planned_expense",
    expense_request_type_label: isReimbursementType ? "Reimbursement" : "Planned Expense",
    reimbursement_flow: isReimbursementType
      ? {
          already_paid: true,
          skips_spend_approval: true,
          next_step: "finance_document_review",
          proof_required_on_submit: true,
          payment_method: form.reimbursementPaymentMethod,
          payment_method_label: getOptionLabel(
            REIMBURSEMENT_PAYMENT_METHODS,
            form.reimbursementPaymentMethod,
            form.reimbursementPaymentMethodOther,
          ),
          reimbursement_reason: form.reimbursementReason.trim(),
        }
      : null,
    generated_identity: {
      title: finalExpenseTitle,
      source: finalExpenseSource,
    },
    selected_currency: selectedCurrency
      ? {
          currency_code: selectedCurrency.currency_code,
          currency_name: selectedCurrency.currency_name,
        }
      : null,
    documentation_link: form.externalDocumentationLink.trim() || null,
    selected_company_name: selectedCompany?.name ?? null,
    selected_employee_name: selectedEmployeeIdentity
      ? getFinanceEmployeePrimaryName(selectedEmployeeIdentity)
      : selectedEmployee?.code ?? null,
    selected_employee_code: selectedEmployeeIdentity
      ? getFinanceEmployeeReferenceLabel(selectedEmployeeIdentity) || null
      : selectedEmployee?.code ?? null,
    selected_employee_secondary: selectedEmployeeIdentity
      ? getFinanceEmployeeSecondaryLabel(selectedEmployeeIdentity)
      : null,
    intake_context: intakeContext ?? "expenses_process_wizard",
    expense_type_details: buildExpenseTypeDetailsMetadata(form),
  };

  const insertResult = await supabase
    .from("finance_expenses")
    .insert({
      expense_number: buildExpenseNumber(),
      title: finalExpenseTitle,
      description: form.description.trim() || null,
      amount: amountValue,
      requested_amount: amountValue,
      final_amount: amountValue,
      expense_date: form.expenseDate,
      expense_type: form.expenseType,
      currency_code: form.currencyCode.trim().toUpperCase(),
      company_id: form.companyId,
      employee_ref_id: form.employeeRefId,
      expense_made_by_type: "employee",
      online_platform:
        form.expenseType === "online_shopping" ? form.onlinePlatform || null : null,
      online_order_number:
        form.expenseType === "online_shopping" ? form.onlineOrderNumber.trim() || null : null,
      online_order_date:
        form.expenseType === "online_shopping" ? form.onlineOrderDate || null : null,
      responsible_person_name:
        form.expenseMadeByType === "owner_management"
          ? form.responsiblePersonName.trim()
          : null,
      other_made_by_explanation:
        form.expenseMadeByType === "other" ? form.otherMadeByExplanation.trim() : null,
      expense_source_name: finalExpenseSource,
      other_expense_explanation:
        form.expenseType === "other" ? form.otherExpenseExplanation.trim() : null,
      is_retroactive: form.isRetroactive,
      retroactive_reason: form.isRetroactive ? form.retroactiveReason.trim() : null,
      request_status: requestStatus,
      status: submitMode === "request" ? "submitted" : "draft",
      approval_status: submitMode === "request" && !isReimbursementType ? "pending" : "not_required",
      payment_status: "not_applicable",
      documentation_status: documentationStatus,
      documentation_submitted_at:
        submitMode === "request" &&
        hasProofAtSubmit
          ? new Date().toISOString()
          : null,
      finance_review_status: "pending_review",
      funding_status: "not_allocated",
      coverage_status: "not_covered",
      recipient_confirmation_status: "not_paid_yet",
      notes: form.notes.trim() || null,
      metadata,
      submitter_user_id: userId,
      created_by: userId,
      updated_by: userId,
    })
    .select("id, expense_number")
    .single();

  if (insertResult.error) throw insertResult.error;

  if (documentationFile) {
    await uploadDocumentation(
      insertResult.data.id,
      insertResult.data.expense_number ?? insertResult.data.id,
      userId,
      documentationFile,
    );
  }

  return insertResult.data;
}
