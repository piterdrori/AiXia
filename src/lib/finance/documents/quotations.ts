import { supabase } from "@/lib/supabase";
import type { FinanceQuotationRow } from "./types";

const QUOTATION_LIST_COLUMNS = [
  "id",
  "quotation_number",
  "client_id",
  "company_id",
  "issue_date",
  "valid_until",
  "status",
  "subtotal",
  "tax_amount",
  "discount_amount",
  "total_amount",
  "currency_id",
  "currency_code",
  "project_id",
  "task_id",
  "notes",
  "metadata",
  "created_at",
  "updated_at",
  "created_by",
  "updated_by",
  "client_name_snapshot",
  "company_name_snapshot",
].join(", ");

export async function fetchActiveQuotations() {
  const { data, error } = await supabase
    .from("finance_quotations")
    .select(QUOTATION_LIST_COLUMNS)
    .not("status", "in", "(archived,deleted)")
    .order("created_at", { ascending: false });

  if (error) throw error;

  return (data ?? []) as unknown as FinanceQuotationRow[];
}

export async function fetchArchivedQuotations() {
  const { data, error } = await supabase
    .from("finance_quotations")
    .select(QUOTATION_LIST_COLUMNS)
    .in("status", ["archived", "deleted"])
    .order("updated_at", { ascending: false });

  if (error) throw error;

  return (data ?? []) as unknown as FinanceQuotationRow[];
}
