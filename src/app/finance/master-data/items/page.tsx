import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Archive,
  ArrowLeft,
  Boxes,
  CheckCircle2,
  Edit3,
  Factory,
  Landmark,
  Layers3,
  Package,
  Plus,
  Search,
  ShoppingCart,
  Trash2,
  Undo2,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import { supabase } from "@/lib/supabase";
import {
  getEffectivePermissions,
  type Permission,
  type Role,
} from "@/lib/permissions";
import {
  archiveItem,
  createItem,
  getItems,
  permanentlyDeleteItem,
  restoreItem,
  updateItem,
  type FinanceItemRow,
  type FinanceItemStatus,
  type FinanceItemType,
  type ItemUpsertInput,
} from "@/lib/finance/items";

type ProfilePermissionRow = {
  role: Role;
  permissions?: Partial<Record<Permission, boolean>> | null;
};

type OptionRow = {
  id: string;
  code?: string | null;
  name: string;
};

type CurrencyOption = {
  id: string;
  currency_code: string;
  currency_name: string;
  currency_symbol: string | null;
  decimal_places: number;
  is_base_currency: boolean;
  status: string;
};

type FormState = {
  code: string;
  name: string;
  status: FinanceItemStatus;
  item_type: FinanceItemType;
  sales_price: string;
  purchase_price: string;
  currency_code: string;
  standard_cost: string;
  last_purchase_cost: string;
  revenue_category_id: string;
  expense_category_id: string;
  tax_code_id: string;
  unit_of_measure_id: string;
  preferred_vendor_id: string;
  is_active_for_sales: boolean;
  is_active_for_purchase: boolean;
  track_inventory: boolean;
  is_manufactured: boolean;
  description: string;
  notes: string;
};

type StatusFilter = "all" | "active" | "inactive" | "archived";
type TypeFilter = "all" | FinanceItemType;
type SortKey =
  | "code"
  | "name"
  | "item_type"
  | "sales_price"
  | "purchase_price"
  | "standard_cost"
  | "status"
  | "updated_at";
type SortDirection = "asc" | "desc";

const EMPTY_FORM: FormState = {
  code: "",
  name: "",
  status: "active",
  item_type: "product",
  sales_price: "0",
  purchase_price: "0",
  currency_code: "",
  standard_cost: "0",
  last_purchase_cost: "0",
  revenue_category_id: "",
  expense_category_id: "",
  tax_code_id: "",
  unit_of_measure_id: "",
  preferred_vendor_id: "",
  is_active_for_sales: true,
  is_active_for_purchase: true,
  track_inventory: false,
  is_manufactured: false,
  description: "",
  notes: "",
};

function formatDateLabel(value: string | null | undefined) {
  if (!value) return "—";

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "—";

  return parsed.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function formatStatusLabel(value: string) {
  return value
    .replaceAll("_", " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function toNumber(value: string | number | null | undefined) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatMoneyLabel(value: string | number | null | undefined, currencyCode?: string | null) {
  const numeric = toNumber(value);

  return `${currencyCode || "—"} ${numeric.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function generateItemCode(name: string, itemType: FinanceItemType) {
  const normalizedName = name
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 24);

  const typePrefixMap: Record<FinanceItemType, string> = {
    product: "PRD",
    service: "SRV",
    component: "CMP",
    assembly: "ASM",
  };

  if (!normalizedName) {
    return typePrefixMap[itemType];
  }

  return `${typePrefixMap[itemType]}_${normalizedName}`;
}

function inputClass() {
  return "h-11 rounded-2xl border-white/10 bg-black/20 text-white placeholder:text-white/30 focus:border-cyan-400/30 focus:ring-cyan-400/10";
}

function selectClass() {
  return "h-11 w-full rounded-2xl border border-white/10 bg-black/20 px-4 text-sm text-white outline-none transition focus:border-cyan-400/30 focus:bg-black/30";
}

function textareaClass() {
  return "min-h-[112px] w-full resize-none rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none transition placeholder:text-white/30 focus:border-cyan-400/30 focus:bg-black/30";
}

function labelClass() {
  return "text-sm font-medium text-slate-300";
}

function statusBadgeClass(status: FinanceItemStatus) {
  if (status === "archived") {
    return "rounded-full border border-rose-400/20 bg-rose-500/10 px-2.5 py-1 text-[11px] uppercase tracking-[0.16em] text-rose-200 shadow-none";
  }

  if (status === "inactive") {
    return "rounded-full border border-amber-400/20 bg-amber-500/10 px-2.5 py-1 text-[11px] uppercase tracking-[0.16em] text-amber-200 shadow-none";
  }

  return "rounded-full border border-emerald-400/20 bg-emerald-500/10 px-2.5 py-1 text-[11px] uppercase tracking-[0.16em] text-emerald-200 shadow-none";
}

function itemTypeBadgeClass(type: FinanceItemType) {
  if (type === "service") {
    return "rounded-full border border-cyan-400/20 bg-cyan-500/10 px-2.5 py-1 text-[11px] uppercase tracking-[0.16em] text-cyan-200 shadow-none";
  }

  if (type === "component") {
    return "rounded-full border border-amber-400/20 bg-amber-500/10 px-2.5 py-1 text-[11px] uppercase tracking-[0.16em] text-amber-200 shadow-none";
  }

  if (type === "assembly") {
    return "rounded-full border border-violet-400/20 bg-violet-500/10 px-2.5 py-1 text-[11px] uppercase tracking-[0.16em] text-violet-200 shadow-none";
  }

  return "rounded-full border border-emerald-400/20 bg-emerald-500/10 px-2.5 py-1 text-[11px] uppercase tracking-[0.16em] text-emerald-200 shadow-none";
}

function SummaryTile({
  label,
  value,
  icon: Icon,
  tone = "cyan",
  description,
}: {
  label: string;
  value: string | number;
  icon: typeof Package;
  tone?: "cyan" | "emerald" | "amber" | "violet" | "rose";
  description: string;
}) {
  const toneMap = {
    cyan: {
      shell:
        "border-cyan-400/15 bg-[radial-gradient(circle_at_top_left,rgba(6,182,212,0.20),transparent_44%),linear-gradient(180deg,rgba(255,255,255,0.05),rgba(255,255,255,0.032))]",
      icon: "border-cyan-400/20 bg-cyan-500/10 text-cyan-200",
      label: "text-cyan-100/75",
      dot: "bg-cyan-300",
    },
    emerald: {
      shell:
        "border-emerald-400/15 bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,0.20),transparent_44%),linear-gradient(180deg,rgba(255,255,255,0.05),rgba(255,255,255,0.032))]",
      icon: "border-emerald-400/20 bg-emerald-500/10 text-emerald-200",
      label: "text-emerald-100/75",
      dot: "bg-emerald-300",
    },
    amber: {
      shell:
        "border-amber-400/15 bg-[radial-gradient(circle_at_top_left,rgba(245,158,11,0.20),transparent_44%),linear-gradient(180deg,rgba(255,255,255,0.05),rgba(255,255,255,0.032))]",
      icon: "border-amber-400/20 bg-amber-500/10 text-amber-200",
      label: "text-amber-100/75",
      dot: "bg-amber-300",
    },
    violet: {
      shell:
        "border-violet-400/15 bg-[radial-gradient(circle_at_top_left,rgba(139,92,246,0.20),transparent_44%),linear-gradient(180deg,rgba(255,255,255,0.05),rgba(255,255,255,0.032))]",
      icon: "border-violet-400/20 bg-violet-500/10 text-violet-200",
      label: "text-violet-100/75",
      dot: "bg-violet-300",
    },
    rose: {
      shell:
        "border-rose-400/15 bg-[radial-gradient(circle_at_top_left,rgba(244,63,94,0.20),transparent_44%),linear-gradient(180deg,rgba(255,255,255,0.05),rgba(255,255,255,0.032))]",
      icon: "border-rose-400/20 bg-rose-500/10 text-rose-200",
      label: "text-rose-100/75",
      dot: "bg-rose-300",
    },
  }[tone];

  return (
    <Card className={`min-h-[156px] overflow-hidden rounded-[28px] border backdrop-blur-xl ${toneMap.shell}`}>
      <CardContent className="relative flex h-full flex-col justify-between overflow-hidden p-5">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_bottom_right,rgba(255,255,255,0.06),transparent_30%)]" />

        <div className="relative flex items-start justify-between gap-4">
          <div>
            <div className={`text-xs uppercase tracking-[0.18em] ${toneMap.label}`}>
              {label}
            </div>
            <div className="mt-4 text-4xl font-semibold tracking-tight text-white">
              {value}
            </div>
          </div>

          <div className={`flex h-12 w-12 items-center justify-center rounded-2xl border ${toneMap.icon}`}>
            <Icon className="h-5 w-5" />
          </div>
        </div>

        <div className="relative mt-6 flex items-center justify-between gap-4">
          <div className="text-sm leading-5 text-slate-400">{description}</div>
          <div className={`h-2.5 w-2.5 flex-none rounded-full ${toneMap.dot}`} />
        </div>
      </CardContent>
    </Card>
  );
}

function optionLabel(row: OptionRow) {
  return `${row.code ? `${row.code} · ` : ""}${row.name}`;
}

function CategorySelect({
  label,
  value,
  options,
  placeholder,
  onChange,
}: {
  label: string;
  value: string;
  options: OptionRow[];
  placeholder: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="grid gap-2">
      <span className={labelClass()}>{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={selectClass()}
      >
        <option value="">{placeholder}</option>
        {options.map((item) => (
          <option key={item.id} value={item.id}>
            {optionLabel(item)}
          </option>
        ))}
      </select>
    </label>
  );
}

function ItemFormModal({
  open,
  editingRow,
  form,
  revenueCategories,
  expenseCategories,
  taxCodes,
  units,
  vendors,
  currencies,
  saving,
  error,
  canSave,
  onClose,
  onChange,
  onSave,
}: {
  open: boolean;
  editingRow: FinanceItemRow | null;
  form: FormState;
  revenueCategories: OptionRow[];
  expenseCategories: OptionRow[];
  taxCodes: OptionRow[];
  units: OptionRow[];
  vendors: OptionRow[];
  currencies: CurrencyOption[];
  saving: boolean;
  error: string;
  canSave: boolean;
  onClose: () => void;
  onChange: <K extends keyof FormState>(key: K, value: FormState[K]) => void;
  onSave: () => void;
}) {
  if (!open) return null;

  const itemTypes: Array<{
    value: FinanceItemType;
    label: string;
    description: string;
    tone: string;
  }> = [
    {
      value: "product",
      label: "Product",
      description: "Sellable or purchasable item.",
      tone: "border-emerald-400/20 bg-emerald-500/10 text-emerald-100",
    },
    {
      value: "service",
      label: "Service",
      description: "Non-inventory service or work.",
      tone: "border-cyan-400/20 bg-cyan-500/10 text-cyan-100",
    },
    {
      value: "component",
      label: "Component",
      description: "Part used in sourcing or manufacturing.",
      tone: "border-amber-400/20 bg-amber-500/10 text-amber-100",
    },
    {
      value: "assembly",
      label: "Assembly",
      description: "Built from components or internal process.",
      tone: "border-violet-400/20 bg-violet-500/10 text-violet-100",
    },
  ];

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div className="flex max-h-[92vh] w-full max-w-6xl flex-col overflow-hidden rounded-[34px] border border-white/10 bg-[#0b111f] shadow-2xl shadow-black/40">
        <div className="relative overflow-hidden border-b border-white/10 bg-white/[0.035] px-6 py-5">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(6,182,212,0.18),transparent_34%),radial-gradient(circle_at_top_right,rgba(139,92,246,0.14),transparent_34%),radial-gradient(circle_at_bottom_right,rgba(16,185,129,0.10),transparent_36%)]" />

          <div className="relative flex items-start justify-between gap-4">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <Badge className="rounded-full border border-cyan-400/20 bg-cyan-500/10 px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-cyan-200 shadow-none">
                  Item Master Data
                </Badge>
                <Badge className="rounded-full border border-emerald-400/20 bg-emerald-500/10 px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-emerald-200 shadow-none">
                  {editingRow ? "Edit Mode" : "Create Mode"}
                </Badge>
              </div>

              <div className="mt-3 text-2xl font-semibold text-white">
                {editingRow ? "Edit Item" : "Create Item"}
              </div>
              <p className="mt-2 max-w-4xl text-sm leading-6 text-slate-400">
                Build reusable product, service, component, and assembly records for
                sales, purchasing, costing, manufacturing, and future inventory flows.
              </p>
            </div>

            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="h-10 rounded-xl border-white/10 bg-black/20 px-3 text-white hover:bg-white/10"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="overflow-y-auto p-6">
          <div className="grid gap-5">
            <section className="rounded-[30px] border border-white/10 bg-white/[0.045] backdrop-blur-xl">
              <div className="border-b border-white/10 px-5 py-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-cyan-400/20 bg-cyan-500/10 text-cyan-200">
                    <Package className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">
                      Item Identity
                    </div>
                    <p className="mt-1 text-xs leading-5 text-slate-500">
                      Type, code, name, status, and core description.
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid gap-4 p-5">
                <div className="grid gap-3 md:grid-cols-4">
                  {itemTypes.map((item) => (
                    <button
                      key={item.value}
                      type="button"
                      onClick={() => onChange("item_type", item.value)}
                      className={`rounded-[24px] border p-4 text-left transition ${
                        form.item_type === item.value
                          ? item.tone
                          : "border-white/10 bg-black/20 text-slate-400 hover:bg-white/[0.06] hover:text-white"
                      }`}
                    >
                      <div className="font-semibold">{item.label}</div>
                      <div className="mt-1 text-xs leading-5 opacity-70">
                        {item.description}
                      </div>
                    </button>
                  ))}
                </div>

                <div className="grid gap-4 md:grid-cols-3">
                  <label className="grid gap-2">
                    <span className={labelClass()}>Generated Item Code</span>
                    <Input
                      value={generateItemCode(form.name, form.item_type)}
                      readOnly
                      placeholder="Auto generated"
                      className="h-11 rounded-2xl border-white/10 bg-black/30 text-slate-300"
                    />
                  </label>

                  <label className="grid gap-2 md:col-span-2">
                    <span className={labelClass()}>Item Name</span>
                    <Input
                      value={form.name}
                      onChange={(event) => onChange("name", event.target.value)}
                      placeholder="Item name"
                      className={inputClass()}
                    />
                  </label>
                </div>

                <label className="grid gap-2">
                  <span className={labelClass()}>Description</span>
                  <textarea
                    value={form.description}
                    onChange={(event) => onChange("description", event.target.value)}
                    placeholder="Short item description"
                    className={textareaClass()}
                  />
                </label>

                <label className="grid gap-2">
                  <span className={labelClass()}>Internal Notes</span>
                  <textarea
                    value={form.notes}
                    onChange={(event) => onChange("notes", event.target.value)}
                    placeholder="Optional internal notes"
                    className={textareaClass()}
                  />
                </label>

                <div className="grid gap-2">
                  <span className={labelClass()}>Status</span>
                  <div className="flex flex-wrap gap-2">
                    {(["active", "inactive", "archived"] as FinanceItemStatus[]).map(
                      (value) => (
                        <button
                          key={value}
                          type="button"
                          onClick={() => onChange("status", value)}
                          className={`h-10 rounded-2xl border px-4 text-sm font-semibold transition ${
                            form.status === value
                              ? value === "active"
                                ? "border-emerald-400/30 bg-emerald-500/15 text-emerald-100"
                                : value === "inactive"
                                  ? "border-amber-400/30 bg-amber-500/15 text-amber-100"
                                  : "border-rose-400/30 bg-rose-500/15 text-rose-100"
                              : "border-white/10 bg-black/20 text-slate-400 hover:bg-white/[0.06] hover:text-white"
                          }`}
                        >
                          {formatStatusLabel(value)}
                        </button>
                      )
                    )}
                  </div>
                </div>
              </div>
            </section>

                        <section className="rounded-[30px] border border-white/10 bg-white/[0.045] backdrop-blur-xl">
              <div className="border-b border-white/10 px-5 py-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-emerald-400/20 bg-emerald-500/10 text-emerald-200">
                    <ShoppingCart className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">
                      Sales & Purchase Values
                    </div>
                    <p className="mt-1 text-xs leading-5 text-slate-500">
                      Pricing, cost, currency, and commercial availability.
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid gap-4 p-5">
                <div className="grid gap-4 md:grid-cols-5">
                  <label className="grid gap-2">
                    <span className={labelClass()}>Currency</span>
                    <select
                      value={form.currency_code}
                      onChange={(event) => onChange("currency_code", event.target.value)}
                      className={selectClass()}
                    >
                      <option value="">Select currency</option>
                      {currencies.map((currency) => (
                        <option key={currency.id} value={currency.currency_code}>
                          {currency.currency_code} · {currency.currency_name}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="grid gap-2">
                    <span className={labelClass()}>Sales Price</span>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={form.sales_price}
                      onChange={(event) => onChange("sales_price", event.target.value)}
                      placeholder="0.00"
                      className={inputClass()}
                    />
                  </label>

                  <label className="grid gap-2">
                    <span className={labelClass()}>Purchase Price</span>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={form.purchase_price}
                      onChange={(event) => onChange("purchase_price", event.target.value)}
                      placeholder="0.00"
                      className={inputClass()}
                    />
                  </label>

                  <label className="grid gap-2">
                    <span className={labelClass()}>Standard Cost</span>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={form.standard_cost}
                      onChange={(event) => onChange("standard_cost", event.target.value)}
                      placeholder="0.00"
                      className={inputClass()}
                    />
                  </label>

                  <label className="grid gap-2">
                    <span className={labelClass()}>Last Purchase Cost</span>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={form.last_purchase_cost}
                      onChange={(event) =>
                        onChange("last_purchase_cost", event.target.value)
                      }
                      placeholder="0.00"
                      className={inputClass()}
                    />
                  </label>
                </div>

                <div className="grid gap-3 md:grid-cols-4">
                  <button
                    type="button"
                    onClick={() =>
                      onChange("is_active_for_sales", !form.is_active_for_sales)
                    }
                    className={`rounded-[24px] border p-4 text-left transition ${
                      form.is_active_for_sales
                        ? "border-emerald-400/20 bg-emerald-500/10 text-emerald-100"
                        : "border-white/10 bg-black/20 text-slate-400 hover:bg-white/[0.06]"
                    }`}
                  >
                    <div className="font-semibold">Active for Sales</div>
                    <div className="mt-1 text-xs leading-5 opacity-70">
                      Can be selected in sales-side documents.
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      onChange("is_active_for_purchase", !form.is_active_for_purchase)
                    }
                    className={`rounded-[24px] border p-4 text-left transition ${
                      form.is_active_for_purchase
                        ? "border-cyan-400/20 bg-cyan-500/10 text-cyan-100"
                        : "border-white/10 bg-black/20 text-slate-400 hover:bg-white/[0.06]"
                    }`}
                  >
                    <div className="font-semibold">Active for Purchase</div>
                    <div className="mt-1 text-xs leading-5 opacity-70">
                      Can be selected in procurement documents.
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => onChange("track_inventory", !form.track_inventory)}
                    className={`rounded-[24px] border p-4 text-left transition ${
                      form.track_inventory
                        ? "border-amber-400/20 bg-amber-500/10 text-amber-100"
                        : "border-white/10 bg-black/20 text-slate-400 hover:bg-white/[0.06]"
                    }`}
                  >
                    <div className="font-semibold">Track Inventory</div>
                    <div className="mt-1 text-xs leading-5 opacity-70">
                      Reserved for inventory-aware items.
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => onChange("is_manufactured", !form.is_manufactured)}
                    className={`rounded-[24px] border p-4 text-left transition ${
                      form.is_manufactured
                        ? "border-violet-400/20 bg-violet-500/10 text-violet-100"
                        : "border-white/10 bg-black/20 text-slate-400 hover:bg-white/[0.06]"
                    }`}
                  >
                    <div className="font-semibold">Manufactured Item</div>
                    <div className="mt-1 text-xs leading-5 opacity-70">
                      Built internally or assembled from parts.
                    </div>
                  </button>
                </div>
              </div>
            </section>

            <section className="rounded-[30px] border border-white/10 bg-white/[0.045] backdrop-blur-xl">
              <div className="border-b border-white/10 px-5 py-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-violet-400/20 bg-violet-500/10 text-violet-200">
                    <Landmark className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">
                      Classification Links
                    </div>
                    <p className="mt-1 text-xs leading-5 text-slate-500">
                      Connect the item to revenue, cost, tax, unit, and vendor master data.
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid gap-4 p-5 md:grid-cols-2">
                <CategorySelect
                  label="Revenue Category"
                  value={form.revenue_category_id}
                  options={revenueCategories}
                  placeholder="No revenue category"
                  onChange={(value) => onChange("revenue_category_id", value)}
                />

                <CategorySelect
                  label="Cost / Expense Category"
                  value={form.expense_category_id}
                  options={expenseCategories}
                  placeholder="No cost category"
                  onChange={(value) => onChange("expense_category_id", value)}
                />

                <CategorySelect
                  label="Tax Code"
                  value={form.tax_code_id}
                  options={taxCodes}
                  placeholder="No tax code"
                  onChange={(value) => onChange("tax_code_id", value)}
                />

                <CategorySelect
                  label="Unit of Measure"
                  value={form.unit_of_measure_id}
                  options={units}
                  placeholder="No unit selected"
                  onChange={(value) => onChange("unit_of_measure_id", value)}
                />

                <div className="md:col-span-2">
                  <CategorySelect
                    label="Preferred Vendor"
                    value={form.preferred_vendor_id}
                    options={vendors}
                    placeholder="No preferred vendor"
                    onChange={(value) => onChange("preferred_vendor_id", value)}
                  />
                </div>
              </div>
            </section>

            {error ? (
              <div className="rounded-[24px] border border-rose-400/20 bg-rose-500/10 px-5 py-4 text-sm text-rose-100">
                {error}
              </div>
            ) : null}
          </div>
        </div>

        <div className="flex flex-col gap-3 border-t border-white/10 bg-white/[0.025] px-6 py-5 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            className="h-11 rounded-2xl border-white/10 bg-black/20 px-4 text-white hover:bg-white/10"
          >
            Cancel
          </Button>

          <Button
            type="button"
            onClick={onSave}
            disabled={saving || !canSave}
            className="h-11 rounded-2xl border border-cyan-400/20 bg-cyan-500/10 px-5 text-cyan-100 hover:bg-cyan-500/15 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? "Saving..." : editingRow ? "Save Changes" : "Create Item"}
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function FinanceItemsPage() {
  const navigate = useNavigate();

  const [rows, setRows] = useState<FinanceItemRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [sortKey, setSortKey] = useState<SortKey>("updated_at");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");

  const [role, setRole] = useState<Role | null>(null);
  const [permissionOverrides, setPermissionOverrides] =
    useState<Partial<Record<Permission, boolean>> | null>(null);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRow, setEditingRow] = useState<FinanceItemRow | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [error, setError] = useState("");
  const [pageMessage, setPageMessage] = useState("");

  const [revenueCategories, setRevenueCategories] = useState<OptionRow[]>([]);
  const [expenseCategories, setExpenseCategories] = useState<OptionRow[]>([]);
  const [taxCodes, setTaxCodes] = useState<OptionRow[]>([]);
  const [units, setUnits] = useState<OptionRow[]>([]);
  const [vendors, setVendors] = useState<OptionRow[]>([]);
  const [currencies, setCurrencies] = useState<CurrencyOption[]>([]);

  const loadPage = useCallback(async () => {
    setLoading(true);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user?.id) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("role, permissions")
          .eq("user_id", user.id)
          .maybeSingle();

        if (profile) {
          const typedProfile = profile as ProfilePermissionRow;
          setRole(typedProfile.role);
          setPermissionOverrides(typedProfile.permissions || null);
        }
      }

      const [
        items,
        revenueResult,
        expenseResult,
        taxResult,
        unitsResult,
        vendorResult,
        currenciesResult,
      ] = await Promise.all([
        getItems(),
        supabase
          .from("finance_revenue_categories")
          .select("id, code, name")
          .eq("status", "active")
          .order("name", { ascending: true }),
        supabase
          .from("finance_expense_categories")
          .select("id, code, name")
          .eq("status", "active")
          .order("name", { ascending: true }),
        supabase
          .from("finance_tax_codes")
          .select("id, code, name")
          .eq("status", "active")
          .order("name", { ascending: true }),
        supabase
          .from("finance_units_of_measure")
          .select("id, code, name")
          .eq("status", "active")
          .order("name", { ascending: true }),
        supabase
          .from("finance_vendors")
          .select("id, code, name")
          .eq("status", "active")
          .order("name", { ascending: true }),
        supabase
          .from("finance_currencies")
          .select(
            "id, currency_code, currency_name, currency_symbol, decimal_places, is_base_currency, status"
          )
          .eq("status", "active")
          .order("currency_code", { ascending: true }),
      ]);

      setRows(items);
      setRevenueCategories((revenueResult.data ?? []) as OptionRow[]);
      setExpenseCategories((expenseResult.data ?? []) as OptionRow[]);
      setTaxCodes((taxResult.data ?? []) as OptionRow[]);
      setUnits((unitsResult.data ?? []) as OptionRow[]);
      setVendors((vendorResult.data ?? []) as OptionRow[]);
      setCurrencies((currenciesResult.data ?? []) as CurrencyOption[]);
    } catch (loadError) {
      console.error("Failed to load items:", loadError);
      setRows([]);
      setError(loadError instanceof Error ? loadError.message : "Failed to load items.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadPage();
  }, [loadPage]);

  useEffect(() => {
    const channel = supabase
      .channel("finance-items-master-data")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "finance_items",
        },
        () => {
          void loadPage();
        }
      )
      .subscribe();

    const intervalId = window.setInterval(() => {
      void loadPage();
    }, 60000);

    return () => {
      window.clearInterval(intervalId);
      void supabase.removeChannel(channel);
    };
  }, [loadPage]);

  const permissions = useMemo(() => {
    if (!role) return null;
    return getEffectivePermissions(role, permissionOverrides);
  }, [role, permissionOverrides]);

  const canCreate = !!permissions?.createFinanceRecords;
  const canEdit = !!permissions?.editFinanceRecords;
  const canArchive = !!permissions?.archiveFinanceRecords;
  const canDelete = canArchive;

  const stats = useMemo(() => {
    return {
      total: rows.length,
      active: rows.filter((row) => row.status === "active").length,
      sales: rows.filter((row) => row.is_active_for_sales).length,
      purchase: rows.filter((row) => row.is_active_for_purchase).length,
      inventory: rows.filter((row) => row.track_inventory).length,
      manufactured: rows.filter((row) => row.is_manufactured).length,
    };
  }, [rows]);

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();

    return rows.filter((row) => {
      const matchesStatus =
        statusFilter === "all" ? true : row.status === statusFilter;
      const matchesType = typeFilter === "all" ? true : row.item_type === typeFilter;

      const matchesSearch =
        !q ||
        row.name.toLowerCase().includes(q) ||
        (row.code ?? "").toLowerCase().includes(q) ||
        row.item_type.toLowerCase().includes(q) ||
        (row.description ?? "").toLowerCase().includes(q) ||
        (row.notes ?? "").toLowerCase().includes(q) ||
        (row.currency_code ?? "").toLowerCase().includes(q);

      return matchesStatus && matchesType && matchesSearch;
    });
  }, [rows, search, statusFilter, typeFilter]);

  const sortedRows = useMemo(() => {
    const sorted = [...filteredRows];

    sorted.sort((a, b) => {
      const direction = sortDirection === "asc" ? 1 : -1;

      if (sortKey === "updated_at") {
        return (
          (new Date(a.updated_at).getTime() - new Date(b.updated_at).getTime()) *
          direction
        );
      }

      if (
        sortKey === "sales_price" ||
        sortKey === "purchase_price" ||
        sortKey === "standard_cost"
      ) {
        return (toNumber(a[sortKey]) - toNumber(b[sortKey])) * direction;
      }

      const first = String(a[sortKey] ?? "");
      const second = String(b[sortKey] ?? "");

      return first.localeCompare(second) * direction;
    });

    return sorted;
  }, [filteredRows, sortDirection, sortKey]);

  function updateSort(nextKey: SortKey) {
    if (sortKey === nextKey) {
      setSortDirection((current) => (current === "asc" ? "desc" : "asc"));
      return;
    }

    setSortKey(nextKey);
    setSortDirection(nextKey === "updated_at" ? "desc" : "asc");
  }

  function sortLabel(key: SortKey) {
    if (sortKey !== key) return "";
    return sortDirection === "asc" ? " ↑" : " ↓";
  }

  function updateForm<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({
      ...current,
      [key]: value,
    }));
  }

  function openCreateDialog() {
    const defaultCurrency =
      currencies.find((currency) => currency.is_base_currency)?.currency_code ||
      currencies[0]?.currency_code ||
      "";

    setEditingRow(null);
    setForm({
      ...EMPTY_FORM,
      currency_code: defaultCurrency,
    });
    setError("");
    setPageMessage("");
    setDialogOpen(true);
  }

  function openEditDialog(row: FinanceItemRow) {
    setEditingRow(row);
    setForm({
      code: row.code ?? "",
      name: row.name,
      status: row.status,
      item_type: row.item_type,
      sales_price: row.sales_price,
      purchase_price: row.purchase_price,
      currency_code: row.currency_code ?? "",
      standard_cost: row.standard_cost,
      last_purchase_cost: row.last_purchase_cost,
      revenue_category_id: row.revenue_category_id ?? "",
      expense_category_id: row.expense_category_id ?? "",
      tax_code_id: row.tax_code_id ?? "",
      unit_of_measure_id: row.unit_of_measure_id ?? "",
      preferred_vendor_id: row.preferred_vendor_id ?? "",
      is_active_for_sales: row.is_active_for_sales,
      is_active_for_purchase: row.is_active_for_purchase,
      track_inventory: row.track_inventory,
      is_manufactured: row.is_manufactured,
      description: row.description ?? "",
      notes: row.notes ?? "",
    });
    setError("");
    setPageMessage("");
    setDialogOpen(true);
  }

  async function handleSave() {
    if (!(editingRow ? canEdit : canCreate)) return;

    if (!form.name.trim()) {
      setError("Name is required.");
      return;
    }

    try {
      setSaving(true);
      setError("");
      setPageMessage("");

      const payload: ItemUpsertInput = {
        code: generateItemCode(form.name, form.item_type),
        name: form.name,
        status: form.status,
        item_type: form.item_type,
        sales_price: form.sales_price,
        purchase_price: form.purchase_price,
        currency_code: form.currency_code || null,
        standard_cost: form.standard_cost,
        last_purchase_cost: form.last_purchase_cost,
        revenue_category_id: form.revenue_category_id || null,
        expense_category_id: form.expense_category_id || null,
        tax_code_id: form.tax_code_id || null,
        unit_of_measure_id: form.unit_of_measure_id || null,
        preferred_vendor_id: form.preferred_vendor_id || null,
        is_active_for_sales: form.is_active_for_sales,
        is_active_for_purchase: form.is_active_for_purchase,
        track_inventory: form.track_inventory,
        is_manufactured: form.is_manufactured,
        description: form.description || null,
        notes: form.notes || null,
      };

      if (editingRow) {
        await updateItem(editingRow.id, payload);
        setPageMessage("Item updated successfully.");
      } else {
        await createItem(payload);
        setPageMessage("Item created successfully.");
      }

      setDialogOpen(false);
      setForm(EMPTY_FORM);
      setEditingRow(null);
      await loadPage();
    } catch (saveError) {
      console.error("Failed to save item:", saveError);
      setError(saveError instanceof Error ? saveError.message : "Failed to save item.");
    } finally {
      setSaving(false);
    }
  }

  async function handleArchive(row: FinanceItemRow) {
    if (!canArchive) return;

    const confirmed = window.confirm(
      "Archive this item? It will be hidden from active item selection but can be restored later."
    );

    if (!confirmed) return;

    try {
      setSaving(true);
      setError("");
      setPageMessage("");
      await archiveItem(row.id);
      setPageMessage("Item archived successfully.");
      await loadPage();
    } catch (actionError) {
      console.error("Failed to archive item:", actionError);
      setError(actionError instanceof Error ? actionError.message : "Failed to archive item.");
    } finally {
      setSaving(false);
    }
  }

  async function handleRestore(row: FinanceItemRow) {
    if (!canArchive) return;

    try {
      setSaving(true);
      setError("");
      setPageMessage("");
      await restoreItem(row.id);
      setPageMessage("Item restored successfully.");
      await loadPage();
    } catch (actionError) {
      console.error("Failed to restore item:", actionError);
      setError(actionError instanceof Error ? actionError.message : "Failed to restore item.");
    } finally {
      setSaving(false);
    }
  }

  async function handleHardDelete(row: FinanceItemRow) {
    if (!canDelete) return;

    const confirmed = window.confirm(
      "Permanently delete this item? Existing transaction line items will keep their historical text but may lose the item link."
    );

    if (!confirmed) return;

    try {
      setSaving(true);
      setError("");
      setPageMessage("");
      await permanentlyDeleteItem(row.id);
      setPageMessage("Item permanently deleted.");
      await loadPage();
    } catch (actionError) {
      console.error("Failed to permanently delete item:", actionError);
      setError(
        actionError instanceof Error ? actionError.message : "Failed to permanently delete item."
      );
    } finally {
      setSaving(false);
    }
  }

  const tableHeaders: Array<
    | { key: SortKey; label: string; sortable: true }
    | { key: "actions"; label: string; sortable: false }
  > = [
    { key: "code", label: "Code", sortable: true },
    { key: "name", label: "Name", sortable: true },
    { key: "item_type", label: "Type", sortable: true },
    { key: "sales_price", label: "Sales", sortable: true },
    { key: "purchase_price", label: "Purchase", sortable: true },
    { key: "standard_cost", label: "Cost", sortable: true },
    { key: "status", label: "Status", sortable: true },
    { key: "updated_at", label: "Updated", sortable: true },
    { key: "actions", label: "Actions", sortable: false },
  ];

  return (
    <div className="min-h-screen bg-[#05070d] px-4 py-4 text-white md:px-6 md:py-6">
      <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-6">
        <section className="relative overflow-hidden rounded-[34px] border border-white/10 bg-white/[0.045] p-6 shadow-2xl shadow-black/30 backdrop-blur-xl">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(6,182,212,0.16),transparent_38%),radial-gradient(circle_at_top_right,rgba(139,92,246,0.12),transparent_34%)]" />

          <div className="relative">
            <button
              type="button"
              onClick={() => navigate("/finance/master-data")}
              className="mb-5 inline-flex items-center justify-center gap-2 rounded-full border border-white/10 bg-white/[0.05] px-5 py-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-300 transition hover:border-white/20 hover:bg-white/[0.08] hover:text-white"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Master Data
            </button>

            <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
              <div className="space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge className="rounded-full border border-white/10 bg-white/[0.07] px-3 py-1 text-[11px] uppercase tracking-[0.24em] text-slate-300 shadow-none">
                    Master Data
                  </Badge>
                  <Badge className="rounded-full border border-cyan-400/20 bg-cyan-500/10 px-3 py-1 text-[11px] uppercase tracking-[0.22em] text-cyan-200 shadow-none">
                    Items
                  </Badge>
                  <Badge className="rounded-full border border-emerald-400/20 bg-emerald-500/10 px-3 py-1 text-[11px] uppercase tracking-[0.22em] text-emerald-200 shadow-none">
                    Sales & Procurement
                  </Badge>
                </div>

                <div>
                  <h1 className="text-3xl font-semibold tracking-tight text-white md:text-5xl">
                    Items
                  </h1>
                  <p className="mt-3 max-w-4xl text-sm leading-7 text-slate-400 md:text-base">
                    Master records for products, services, components, and assemblies used
                    across quotations, invoices, purchasing, costing, sourcing, and future
                    inventory or manufacturing workflows.
                  </p>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 xl:w-[440px]">
                <div className="rounded-[24px] border border-cyan-400/15 bg-cyan-500/10 p-4">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-cyan-200/70">
                    Commercial Use
                  </div>
                  <div className="mt-2 text-sm font-semibold text-white">
                    Sales & Purchase Ready
                  </div>
                  <p className="mt-1 text-xs leading-5 text-cyan-100/65">
                    Shared by outgoing and incoming transaction documents.
                  </p>
                </div>

                <div className="rounded-[24px] border border-violet-400/15 bg-violet-500/10 p-4">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-violet-200/70">
                    Manufacturing Layer
                  </div>
                  <div className="mt-2 text-sm font-semibold text-white">
                    Components & Assemblies
                  </div>
                  <p className="mt-1 text-xs leading-5 text-violet-100/65">
                    Prepared for costing, sourcing, and inventory expansion.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {error ? (
          <div className="rounded-[24px] border border-rose-400/20 bg-rose-500/10 px-5 py-4 text-sm text-rose-100">
            {error}
          </div>
        ) : null}

        {pageMessage ? (
          <div className="rounded-[24px] border border-emerald-400/20 bg-emerald-500/10 px-5 py-4 text-sm text-emerald-100">
            {pageMessage}
          </div>
        ) : null}

        <section>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-6">
            <SummaryTile
              label="Total Items"
              value={loading ? "—" : stats.total}
              icon={Package}
              tone="cyan"
              description="All configured item records"
            />
            <SummaryTile
              label="Active"
              value={loading ? "—" : stats.active}
              icon={CheckCircle2}
              tone="emerald"
              description="Available for selection"
            />
            <SummaryTile
              label="Sales"
              value={loading ? "—" : stats.sales}
              icon={ShoppingCart}
              tone="violet"
              description="Enabled for sales flows"
            />
            <SummaryTile
              label="Purchase"
              value={loading ? "—" : stats.purchase}
              icon={Landmark}
              tone="amber"
              description="Enabled for purchase flows"
            />
            <SummaryTile
              label="Inventory"
              value={loading ? "—" : stats.inventory}
              icon={Boxes}
              tone="cyan"
              description="Inventory tracking enabled"
            />
            <SummaryTile
              label="Manufactured"
              value={loading ? "—" : stats.manufactured}
              icon={Factory}
              tone="rose"
              description="Built or assembled internally"
            />
          </div>
        </section>

        <Card className="overflow-hidden rounded-[30px] border border-white/10 bg-white/[0.045] backdrop-blur-xl">
          <CardHeader className="border-b border-white/10 px-5 py-4">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div className="space-y-2">
                <Badge className="w-fit rounded-full border border-white/10 bg-white/[0.06] px-3 py-1 text-[11px] uppercase tracking-[0.22em] text-slate-400 shadow-none">
                  Item Registry
                </Badge>
                <CardTitle className="text-white">
                  Item Master List
                </CardTitle>
                <CardDescription className="text-slate-500">
                  Search, filter, sort, create, edit, archive, restore, and delete item records.
                </CardDescription>
              </div>

              <div className="flex w-full flex-col gap-3 xl:max-w-[980px] xl:flex-row">
                <div className="relative flex-1">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                  <Input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Search code, name, type, description, notes, or currency..."
                    className={`${inputClass()} pl-10`}
                  />
                </div>

                <div className="flex gap-2 overflow-x-auto pb-1">
                  {(["all", "active", "inactive", "archived"] as StatusFilter[]).map(
                    (value) => (
                      <Button
                        key={value}
                        type="button"
                        variant="outline"
                        onClick={() => setStatusFilter(value)}
                        className={`h-11 rounded-2xl border-white/10 px-4 capitalize text-white ${
                          statusFilter === value
                            ? "bg-cyan-500/15 text-cyan-100"
                            : "bg-black/20 hover:bg-white/[0.06]"
                        }`}
                      >
                        {value}
                      </Button>
                    )
                  )}
                </div>

                <div className="flex gap-2 overflow-x-auto pb-1">
                  {(["all", "product", "service", "component", "assembly"] as TypeFilter[]).map(
                    (value) => (
                      <Button
                        key={value}
                        type="button"
                        variant="outline"
                        onClick={() => setTypeFilter(value)}
                        className={`h-11 rounded-2xl border-white/10 px-4 capitalize text-white ${
                          typeFilter === value
                            ? "bg-violet-500/15 text-violet-100"
                            : "bg-black/20 hover:bg-white/[0.06]"
                        }`}
                      >
                        {value}
                      </Button>
                    )
                  )}
                </div>

                {canCreate ? (
                  <Button
                    type="button"
                    onClick={openCreateDialog}
                    className="h-11 rounded-2xl border border-emerald-400/20 bg-emerald-500/10 px-4 text-emerald-100 hover:bg-emerald-500/15"
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    New Item
                  </Button>
                ) : null}
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <div className="max-h-[720px] overflow-y-auto">
                <table className="w-full min-w-[1460px] border-collapse">
                  <thead className="sticky top-0 z-10">
                    <tr className="border-b border-white/10 bg-black/70 text-left">
                      {tableHeaders.map((header) => (
                        <th
                          key={header.key}
                          className="px-5 py-4 text-[11px] uppercase tracking-[0.18em] text-slate-500"
                        >
                          {header.sortable ? (
                            <button
                              type="button"
                              onClick={() => updateSort(header.key)}
                              className="transition hover:text-slate-300"
                            >
                              {header.label}
                              {sortLabel(header.key)}
                            </button>
                          ) : (
                            <span>{header.label}</span>
                          )}
                        </th>
                      ))}
                    </tr>
                  </thead>

                  <tbody>
                    {loading ? (
                      <tr>
                        <td colSpan={9} className="px-5 py-12 text-sm text-slate-400">
                          Loading items...
                        </td>
                      </tr>
                    ) : sortedRows.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="px-5 py-12 text-sm text-slate-400">
                          No items found.
                        </td>
                      </tr>
                    ) : (
                      sortedRows.map((row) => (
                        <tr
                          key={row.id}
                          className="border-b border-white/10 text-sm text-slate-300 transition hover:bg-white/[0.035]"
                        >
                          <td className="px-5 py-4">
                            <div className="font-semibold text-white">
                              {row.code || "—"}
                            </div>
                          </td>

                          <td className="px-5 py-4">
                            <div className="font-semibold text-white">
                              {row.name}
                            </div>
                            <div className="mt-1 max-w-[360px] truncate text-xs text-slate-500">
                              {row.description?.trim() || "No description"}
                            </div>
                          </td>

                          <td className="px-5 py-4">
                            <Badge className={itemTypeBadgeClass(row.item_type)}>
                              {formatStatusLabel(row.item_type)}
                            </Badge>
                          </td>

                          <td className="px-5 py-4 text-slate-300">
                            {formatMoneyLabel(row.sales_price, row.currency_code)}
                          </td>

                          <td className="px-5 py-4 text-slate-300">
                            {formatMoneyLabel(row.purchase_price, row.currency_code)}
                          </td>

                          <td className="px-5 py-4 text-slate-300">
                            {formatMoneyLabel(row.standard_cost, row.currency_code)}
                          </td>

                          <td className="px-5 py-4">
                            <Badge className={statusBadgeClass(row.status)}>
                              {formatStatusLabel(row.status)}
                            </Badge>
                          </td>

                          <td className="px-5 py-4 text-slate-400">
                            {formatDateLabel(row.updated_at)}
                          </td>

                          <td className="px-5 py-4">
                            <div className="flex flex-wrap justify-end gap-2">
                              {canEdit ? (
                                <Button
                                  type="button"
                                  variant="outline"
                                  onClick={() => openEditDialog(row)}
                                  className="h-9 rounded-xl border-cyan-400/20 bg-cyan-500/10 px-3 text-xs text-cyan-100 hover:bg-cyan-500/15"
                                >
                                  <Edit3 className="mr-1.5 h-3.5 w-3.5" />
                                  Edit
                                </Button>
                              ) : null}

                              {canArchive && row.status === "archived" ? (
                                <Button
                                  type="button"
                                  variant="outline"
                                  onClick={() => void handleRestore(row)}
                                  disabled={saving}
                                  className="h-9 rounded-xl border-emerald-400/20 bg-emerald-500/10 px-3 text-xs text-emerald-100 hover:bg-emerald-500/15 disabled:opacity-50"
                                >
                                  <Undo2 className="mr-1.5 h-3.5 w-3.5" />
                                  Restore
                                </Button>
                              ) : null}

                              {canArchive && row.status !== "archived" ? (
                                <Button
                                  type="button"
                                  variant="outline"
                                  onClick={() => void handleArchive(row)}
                                  disabled={saving}
                                  className="h-9 rounded-xl border-amber-400/20 bg-amber-500/10 px-3 text-xs text-amber-100 hover:bg-amber-500/15 disabled:opacity-50"
                                >
                                  <Archive className="mr-1.5 h-3.5 w-3.5" />
                                  Archive
                                </Button>
                              ) : null}

                              {canDelete ? (
                                <Button
                                  type="button"
                                  variant="outline"
                                  onClick={() => void handleHardDelete(row)}
                                  disabled={saving}
                                  className="h-9 rounded-xl border-rose-400/20 bg-rose-500/10 px-3 text-xs text-rose-100 hover:bg-rose-500/15 disabled:opacity-50"
                                >
                                  <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                                  Delete
                                </Button>
                              ) : null}
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <ItemFormModal
        open={dialogOpen}
        editingRow={editingRow}
        form={form}
        revenueCategories={revenueCategories}
        expenseCategories={expenseCategories}
        taxCodes={taxCodes}
        units={units}
        vendors={vendors}
        currencies={currencies}
        saving={saving}
        error={error}
        canSave={editingRow ? canEdit : canCreate}
        onClose={() => {
          setDialogOpen(false);
          setError("");
        }}
        onChange={updateForm}
        onSave={() => void handleSave()}
      />
    </div>
  );
}
