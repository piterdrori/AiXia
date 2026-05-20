import { supabase } from "@/lib/supabase";

export type EntityTransactionUsageKind = "client" | "vendor" | "company" | "item";

export type EntityTransactionUsageCount = {
  key: string;
  label: string;
  count: number;
};

export type EntityTransactionUsageResult = {
  entityKind: EntityTransactionUsageKind;
  entityId: string;
  counts: EntityTransactionUsageCount[];
  totalLinked: number;
};

async function safeCount(
  tableName: string,
  column: string,
  entityId: string,
): Promise<number> {
  try {
    const result = await supabase
      .from(tableName)
      .select("id", { count: "exact", head: true })
      .eq(column, entityId)
      .not("status", "in", "(archived,deleted)");

    if (result.error) {
      const fallback = await supabase
        .from(tableName)
        .select("id", { count: "exact", head: true })
        .eq(column, entityId);

      if (fallback.error) return 0;
      return fallback.count ?? 0;
    }

    return result.count ?? 0;
  } catch {
    return 0;
  }
}

export async function fetchEntityTransactionUsage(
  entityKind: EntityTransactionUsageKind,
  entityId: string,
): Promise<EntityTransactionUsageResult> {
  if (!entityId) {
    return { entityKind, entityId, counts: [], totalLinked: 0 };
  }

  let counts: EntityTransactionUsageCount[] = [];

  switch (entityKind) {
    case "client":
      counts = [
        {
          key: "quotations",
          label: "Quotations",
          count: await safeCount("finance_quotations", "client_id", entityId),
        },
        {
          key: "customer-pos",
          label: "Customer POs",
          count: await safeCount(
            "finance_client_purchase_orders",
            "client_id",
            entityId,
          ),
        },
        {
          key: "invoices",
          label: "Invoices",
          count: await safeCount("finance_invoices_issued", "client_id", entityId),
        },
        {
          key: "proforma-invoices",
          label: "Proforma Invoices",
          count: await safeCount(
            "finance_proforma_invoices",
            "client_id",
            entityId,
          ),
        },
      ];
      break;

    case "vendor":
      counts = [
        {
          key: "vendor-quotations",
          label: "Vendor Quotations",
          count: await safeCount(
            "finance_vendor_quotations",
            "vendor_id",
            entityId,
          ),
        },
        {
          key: "purchase-orders",
          label: "Purchase Orders",
          count: await safeCount("finance_purchase_orders", "vendor_id", entityId),
        },
        {
          key: "bills",
          label: "Bills",
          count: await safeCount("finance_bills_received", "vendor_id", entityId),
        },
        {
          key: "payments-made",
          label: "Payments Made",
          count: await safeCount("finance_payments_made", "vendor_id", entityId),
        },
      ];
      break;

    case "company":
      counts = [
        {
          key: "bank-accounts",
          label: "Bank Accounts",
          count: await safeCount("finance_bank_accounts", "company_id", entityId),
        },
        {
          key: "invoices",
          label: "Invoices",
          count: await safeCount("finance_invoices_issued", "company_id", entityId),
        },
        {
          key: "purchase-orders",
          label: "Purchase Orders",
          count: await safeCount("finance_purchase_orders", "company_id", entityId),
        },
        {
          key: "bills",
          label: "Bills",
          count: await safeCount("finance_bills_received", "company_id", entityId),
        },
      ];
      break;

    case "item":
      counts = [
        {
          key: "quotation-lines",
          label: "Quotation Lines",
          count: await safeCount("finance_quotation_line_items", "item_id", entityId),
        },
        {
          key: "invoice-lines",
          label: "Invoice Lines",
          count: await safeCount(
            "finance_invoice_issued_line_items",
            "item_id",
            entityId,
          ),
        },
        {
          key: "po-lines",
          label: "PO Lines",
          count: await safeCount(
            "finance_purchase_order_line_items",
            "item_id",
            entityId,
          ),
        },
      ];
      break;
  }

  const totalLinked = counts.reduce((sum, row) => sum + row.count, 0);

  return { entityKind, entityId, counts, totalLinked };
}
