import { supabase } from "@/lib/supabase";

type ActivityEntityType =
  | "project"
  | "task"
  | "file"
  | "member"
  | "comment"
  | "system"
  | "finance_client"
  | "finance_vendor"
  | "finance_company"
  | "finance_bank_account"
  | "finance_vendor_bank_account"
  | "finance_payment_method"
  | "finance_payment_term"
  | "finance_shipping_term"
  | "finance_tax_code"
  | "finance_unit_of_measure"
  | "finance_expense_category"
  | "finance_revenue_category"
  | "finance_item"
  | "finance_currency"
  | "finance_exchange_rate"
  | "finance_attachment"
  | "finance_comment"
  | "finance_setting"
  | "finance_invoice_issued"
  | "finance_payment_received"
  | "finance_payment_made"
  | "finance_bill_received"
  | "finance_expense"
  | "finance_reimbursement"
  | "finance_payroll_run"
  | "finance_paycheck";

type LogActivityInput = {
  projectId?: string | null;
  taskId?: string | null;
  actionType: string;
  entityType: ActivityEntityType;
  entityId?: string | null;
  message: string;
};

export async function logActivity({
  projectId = null,
  taskId = null,
  actionType,
  entityType,
  entityId = null,
  message,
}: LogActivityInput) {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const userId = user?.id ?? null;

    const { error } = await supabase.from("activity_logs").insert({
      project_id: projectId,
      task_id: taskId,
      user_id: userId,
      action_type: actionType,
      entity_type: entityType,
      entity_id: entityId,
      message,
    });

    if (error) {
      console.error("Activity log insert error:", error);
    }
  } catch (error) {
    console.error("Activity logger error:", error);
  }
}
