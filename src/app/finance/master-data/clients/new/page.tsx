import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  ChevronDown,
  Plus,
  RefreshCw,
  Save,
  Trash2,
  Users,
} from "lucide-react";

import { supabase } from "@/lib/supabase";
import { createClient } from "@/lib/finance/clients";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";

type PaymentTermOption = {
  id: string;
  name: string;
  code: string;
  due_days: number;
  is_default: boolean;
};

type CurrencyOption = {
  id: string;
  currency_code: string;
  currency_name: string;
  is_base_currency: boolean;
};

type DeliveryTermOption = {
  id: string;
  code: string;
  name: string;
};

type EmployeeOption = {
  id: string;
  label: string;
  email: string;
};

type PersonnelRow = {
  id: string;
  employee_user_id: string;
  employee_label: string;
  name: string;
  role: string;
  email: string;
  phone: string;
};

type CommunicationRow = {
  id: string;
  label: string;
  type: "company" | "personnel" | "other";
  email: string;
  phone: string;
};

type AddressRow = {
  id: string;
  label: string;
  country: string;
  line1: string;
  line2: string;
};

type ShippingAddressRow = {
  id: string;
  label: string;
  country: string;
  line1: string;
  line2: string;
};

type FormState = {
  legal_name: string;
  status: "active" | "inactive" | "archived";
  notes: string;
  payment_terms_id: string;
  payment_terms_custom: string;
  delivery_term: string;
  delivery_term_custom: string;
  currency_code: string;
  currency_custom: string;
  personnel: PersonnelRow[];
  communications: CommunicationRow[];
  addresses: AddressRow[];
  shipping_addresses: ShippingAddressRow[];
};

type RawProfileRow = Record<string, unknown>;

const CUSTOM_OPTION_VALUE = "__custom__";

const FALLBACK_PAYMENT_TERMS = [
  { id: "fallback-immediate", name: "Due Immediately", code: "IMMEDIATE", due_days: 0, is_default: false },
  { id: "fallback-net7", name: "Net 7", code: "NET7", due_days: 7, is_default: false },
  { id: "fallback-net15", name: "Net 15", code: "NET15", due_days: 15, is_default: false },
  { id: "fallback-net30", name: "Net 30", code: "NET30", due_days: 30, is_default: false },
  { id: "fallback-net45", name: "Net 45", code: "NET45", due_days: 45, is_default: false },
  { id: "fallback-net60", name: "Net 60", code: "NET60", due_days: 60, is_default: false },
];

const FALLBACK_DELIVERY_TERMS = [
  { id: "fallback-exw", code: "EXW", name: "Ex Works" },
  { id: "fallback-fob", code: "FOB", name: "Free On Board" },
  { id: "fallback-cif", code: "CIF", name: "Cost, Insurance and Freight" },
  { id: "fallback-ddp", code: "DDP", name: "Delivered Duty Paid" },
  { id: "fallback-dap", code: "DAP", name: "Delivered At Place" },
];

const FALLBACK_CURRENCIES = [
  { id: "fallback-usd", currency_code: "USD", currency_name: "US Dollar", is_base_currency: true },
  { id: "fallback-eur", currency_code: "EUR", currency_name: "Euro", is_base_currency: false },
  { id: "fallback-cny", currency_code: "CNY", currency_name: "Chinese Yuan", is_base_currency: false },
  { id: "fallback-gbp", currency_code: "GBP", currency_name: "British Pound", is_base_currency: false },
  { id: "fallback-ils", currency_code: "ILS", currency_name: "Israeli Shekel", is_base_currency: false },
];

function uid(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

function emptyPersonnelRow(): PersonnelRow {
  return {
    id: uid("personnel"),
    employee_user_id: "",
    employee_label: "",
    name: "",
    role: "",
    email: "",
    phone: "",
  };
}

function emptyCommunicationRow(type: CommunicationRow["type"] = "company"): CommunicationRow {
  return {
    id: uid("communication"),
    label: "",
    type,
    email: "",
    phone: "",
  };
}

function emptyAddressRow(): AddressRow {
  return {
    id: uid("address"),
    label: "",
    country: "",
    line1: "",
    line2: "",
  };
}

function emptyShippingAddressRow(): ShippingAddressRow {
  return {
    id: uid("shipping"),
    label: "",
    country: "",
    line1: "",
    line2: "",
  };
}

const EMPTY_FORM: FormState = {
  legal_name: "",
  status: "active",
  notes: "",
  payment_terms_id: "",
  payment_terms_custom: "",
  delivery_term: "",
  delivery_term_custom: "",
  currency_code: "",
  currency_custom: "",
  personnel: [emptyPersonnelRow()],
  communications: [emptyCommunicationRow("company")],
  addresses: [emptyAddressRow()],
  shipping_addresses: [emptyShippingAddressRow()],
};

function mergeUniquePaymentTerms(items: PaymentTermOption[]) {
  const map = new Map<string, PaymentTermOption>();
  [...items, ...FALLBACK_PAYMENT_TERMS].forEach((item) => {
    const key = `${item.code}-${item.name}-${item.due_days}`;
    if (!map.has(key)) map.set(key, item);
  });
  return Array.from(map.values());
}

function mergeUniqueDeliveryTerms(items: DeliveryTermOption[]) {
  const map = new Map<string, DeliveryTermOption>();
  [...items, ...FALLBACK_DELIVERY_TERMS].forEach((item) => {
    const key = `${item.code}-${item.name}`;
    if (!map.has(key)) map.set(key, item);
  });
  return Array.from(map.values());
}

function mergeUniqueCurrencies(items: CurrencyOption[]) {
  const map = new Map<string, CurrencyOption>();
  [...items, ...FALLBACK_CURRENCIES].forEach((item) => {
    if (!map.has(item.currency_code)) map.set(item.currency_code, item);
  });
  return Array.from(map.values());
}

function getProfileLabel(profile: RawProfileRow) {
  const labelCandidates = [
    profile.full_name,
    profile.name,
    profile.display_name,
    profile.email,
    profile.user_id,
  ];

  const label = labelCandidates.find(
    (value) => typeof value === "string" && value.trim().length > 0
  );

  return typeof label === "string" ? label : "Unnamed employee";
}

function getProfileEmail(profile: RawProfileRow) {
  const emailCandidate = profile.email;
  return typeof emailCandidate === "string" ? emailCandidate : "";
}

function FormSection({
  title,
  description,
  icon,
  accentClass,
  actions,
  children,
}: {
  title: string;
  description: string;
  icon?: React.ReactNode;
  accentClass?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <Card className="overflow-hidden rounded-[28px] border border-white/10 bg-[linear-gradient(135deg,rgba(255,255,255,0.06),rgba(255,255,255,0.03))] backdrop-blur-xl shadow-[0_20px_60px_rgba(0,0,0,0.24)]">
      <CardHeader className="border-b border-white/8 pb-4">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div className="flex items-start gap-4">
            <div
              className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-white shadow-[0_0_30px_rgba(255,255,255,0.08)] ${accentClass ?? ""}`}
            >
              {icon}
            </div>

            <div>
              <CardTitle className="text-white">{title}</CardTitle>
              <CardDescription className="mt-1 text-white/45">
                {description}
              </CardDescription>
            </div>
          </div>

          {actions ? <div className="flex shrink-0 flex-wrap gap-3">{actions}</div> : null}
        </div>
      </CardHeader>

      <CardContent className="p-5">{children}</CardContent>
    </Card>
  );
}

function FieldLabel({
  label,
  required = false,
}: {
  label: string;
  required?: boolean;
}) {
  return (
    <label className="mb-2 block text-sm font-medium text-white/75">
      {label}
      {required ? <span className="ml-1 text-rose-300">*</span> : null}
    </label>
  );
}

function InputField(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <Input
      {...props}
      className={`h-11 rounded-2xl border-white/10 bg-white/5 text-white placeholder:text-white/30 ${props.className ?? ""}`}
    />
  );
}

function TextareaField(
  props: React.TextareaHTMLAttributes<HTMLTextAreaElement>
) {
  return (
    <textarea
      {...props}
      className={`min-h-[120px] w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none placeholder:text-white/30 ${props.className ?? ""}`}
    />
  );
}

function SelectField(
  props: React.SelectHTMLAttributes<HTMLSelectElement> & {
    children: React.ReactNode;
  }
) {
  return (
    <select
      {...props}
      className={`h-11 w-full rounded-2xl border border-white/10 bg-white/5 px-4 text-sm text-white outline-none ${props.className ?? ""}`}
    >
      {props.children}
    </select>
  );
}

function AddButton({
  label,
  onClick,
}: {
  label: string;
  onClick: () => void;
}) {
  return (
    <Button
      type="button"
      variant="outline"
      onClick={onClick}
      className="h-11 rounded-2xl border-cyan-400/20 bg-cyan-500/10 px-4 text-cyan-100 hover:bg-cyan-500/20"
    >
      <Plus className="mr-2 h-4 w-4" />
      {label}
    </Button>
  );
}

function RemoveButton({ onClick }: { onClick: () => void }) {
  return (
    <Button
      type="button"
      variant="outline"
      onClick={onClick}
      className="h-11 rounded-2xl border-rose-400/20 bg-rose-500/10 px-4 text-rose-100 hover:bg-rose-500/20"
    >
      <Trash2 className="mr-2 h-4 w-4" />
      Remove
    </Button>
  );
}

export default function FinanceMasterDataClientCreatePage() {
  const navigate = useNavigate();

  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [paymentTerms, setPaymentTerms] = useState<PaymentTermOption[]>([]);
  const [currencies, setCurrencies] = useState<CurrencyOption[]>([]);
  const [deliveryTerms, setDeliveryTerms] = useState<DeliveryTermOption[]>([]);
  const [employees, setEmployees] = useState<EmployeeOption[]>([]);
  const [isLoadingOptions, setIsLoadingOptions] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const loadOptions = useCallback(async () => {
    setIsLoadingOptions(true);

    try {
      const [
        paymentTermsResult,
        currenciesResult,
        deliveryTermsResult,
        employeesResult,
      ] = await Promise.all([
        supabase
          .from("finance_payment_terms")
          .select("id, name, code, due_days, is_default")
          .eq("status", "active")
          .order("is_default", { ascending: false })
          .order("due_days", { ascending: true }),
        supabase
          .from("finance_currencies")
          .select("id, currency_code, currency_name, is_base_currency")
          .eq("status", "active")
          .order("is_base_currency", { ascending: false })
          .order("currency_code", { ascending: true }),
        (async () => {
          try {
            return await supabase
              .from("finance_shipping_terms")
              .select("id, code, name")
              .order("code", { ascending: true });
          } catch {
            return { data: [], error: null };
          }
        })(),
        supabase.from("profiles").select("*").order("created_at", { ascending: false }).limit(200),
      ]);

      const nextPaymentTerms = mergeUniquePaymentTerms(
        (paymentTermsResult.data ?? []) as PaymentTermOption[]
      );
      const nextCurrencies = mergeUniqueCurrencies(
        (currenciesResult.data ?? []) as CurrencyOption[]
      );
      const nextDeliveryTerms = mergeUniqueDeliveryTerms(
        (deliveryTermsResult.data ?? []) as DeliveryTermOption[]
      );

      const nextEmployees = ((employeesResult.data ?? []) as RawProfileRow[]).map(
        (profile) => ({
          id:
            typeof profile.user_id === "string"
              ? profile.user_id
              : uid("employee"),
          label: getProfileLabel(profile),
          email: getProfileEmail(profile),
        })
      );

      setPaymentTerms(nextPaymentTerms);
      setCurrencies(nextCurrencies);
      setDeliveryTerms(nextDeliveryTerms);
      setEmployees(nextEmployees);

      setForm((prev) => ({
        ...prev,
        payment_terms_id:
          prev.payment_terms_id ||
          nextPaymentTerms.find((item) => item.is_default)?.id ||
          nextPaymentTerms[0]?.id ||
          "",
        currency_code:
          prev.currency_code ||
          nextCurrencies.find((item) => item.is_base_currency)?.currency_code ||
          nextCurrencies[0]?.currency_code ||
          "",
        delivery_term:
          prev.delivery_term || nextDeliveryTerms[0]?.name || "",
      }));
    } catch (error) {
      console.error("Failed to load create-client options:", error);
    } finally {
      setIsLoadingOptions(false);
    }
  }, []);

  useEffect(() => {
    void loadOptions();
  }, [loadOptions]);

  const selectedPaymentTermLabel = useMemo(() => {
    if (form.payment_terms_id === CUSTOM_OPTION_VALUE) {
      return form.payment_terms_custom || "Custom payment term";
    }

    return (
      paymentTerms.find((item) => item.id === form.payment_terms_id)?.name || "—"
    );
  }, [form.payment_terms_custom, form.payment_terms_id, paymentTerms]);

  const selectedCurrencyLabel = useMemo(() => {
    if (form.currency_code === CUSTOM_OPTION_VALUE) {
      return form.currency_custom || "Custom currency";
    }

    const selected = currencies.find(
      (item) => item.currency_code === form.currency_code
    );
    return selected
      ? `${selected.currency_code} • ${selected.currency_name}`
      : "—";
  }, [currencies, form.currency_code, form.currency_custom]);

  const selectedDeliveryTermLabel = useMemo(() => {
    if (form.delivery_term === CUSTOM_OPTION_VALUE) {
      return form.delivery_term_custom || "Custom delivery term";
    }

    return form.delivery_term || "—";
  }, [form.delivery_term, form.delivery_term_custom]);

  function updateForm<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({
      ...prev,
      [key]: value,
    }));
  }

  function updatePersonnelRow(
    rowId: string,
    updater: (row: PersonnelRow) => PersonnelRow
  ) {
    setForm((prev) => ({
      ...prev,
      personnel: prev.personnel.map((row) =>
        row.id === rowId ? updater(row) : row
      ),
    }));
  }

  function updateCommunicationRow(
    rowId: string,
    updater: (row: CommunicationRow) => CommunicationRow
  ) {
    setForm((prev) => ({
      ...prev,
      communications: prev.communications.map((row) =>
        row.id === rowId ? updater(row) : row
      ),
    }));
  }

  function updateAddressRow(
    rowId: string,
    updater: (row: AddressRow) => AddressRow
  ) {
    setForm((prev) => ({
      ...prev,
      addresses: prev.addresses.map((row) =>
        row.id === rowId ? updater(row) : row
      ),
    }));
  }

  function updateShippingAddressRow(
    rowId: string,
    updater: (row: ShippingAddressRow) => ShippingAddressRow
  ) {
    setForm((prev) => ({
      ...prev,
      shipping_addresses: prev.shipping_addresses.map((row) =>
        row.id === rowId ? updater(row) : row
      ),
    }));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmedLegalName = form.legal_name.trim();
    if (!trimmedLegalName) {
      setFormError("Legal name is required.");
      return;
    }

    const primaryPersonnel =
      form.personnel.find(
        (row) => row.name.trim() || row.employee_label.trim() || row.email.trim()
      ) || null;

    const companyCommunication =
      form.communications.find((row) => row.type === "company") ||
      form.communications[0] ||
      null;

    const personnelCommunication =
      form.communications.find((row) => row.type === "personnel") || null;

    const primaryAddress =
      form.addresses.find(
        (row) => row.country.trim() || row.line1.trim() || row.line2.trim()
      ) || null;

    const primaryShippingAddress =
      form.shipping_addresses.find(
        (row) => row.country.trim() || row.line1.trim() || row.line2.trim()
      ) || null;

    try {
      setIsSaving(true);
      setFormError(null);

      const created = await createClient({
        legal_name: trimmedLegalName,
        contact_name:
          primaryPersonnel?.name.trim() ||
          primaryPersonnel?.employee_label.trim() ||
          null,
        company_related_personnel:
          primaryPersonnel?.role.trim() ||
          primaryPersonnel?.name.trim() ||
          primaryPersonnel?.employee_label.trim() ||
          null,
        status: form.status,
        company_email: companyCommunication?.email.trim() || null,
        personnel_email:
          personnelCommunication?.email.trim() ||
          primaryPersonnel?.email.trim() ||
          null,
        company_phone: companyCommunication?.phone.trim() || null,
        personnel_phone:
          personnelCommunication?.phone.trim() ||
          primaryPersonnel?.phone.trim() ||
          null,
        country: primaryAddress?.country.trim() || null,
        address_line_1: primaryAddress?.line1.trim() || null,
        address_line_2: primaryAddress?.line2.trim() || null,
        shipping_address_line_1: primaryShippingAddress?.line1.trim() || null,
        shipping_address_line_2: primaryShippingAddress?.line2.trim() || null,
        payment_terms_id:
          form.payment_terms_id && form.payment_terms_id !== CUSTOM_OPTION_VALUE
            ? form.payment_terms_id
            : null,
        delivery_term:
          form.delivery_term === CUSTOM_OPTION_VALUE
            ? form.delivery_term_custom.trim() || null
            : form.delivery_term || null,
        currency_code:
          form.currency_code === CUSTOM_OPTION_VALUE
            ? form.currency_custom.trim() || null
            : form.currency_code || null,
        notes: form.notes || null,
        metadata: {
          personnel: form.personnel,
          communications: form.communications,
          addresses: form.addresses,
          shipping_addresses: form.shipping_addresses,
          custom_payment_term:
            form.payment_terms_id === CUSTOM_OPTION_VALUE
              ? form.payment_terms_custom.trim() || null
              : null,
          custom_delivery_term:
            form.delivery_term === CUSTOM_OPTION_VALUE
              ? form.delivery_term_custom.trim() || null
              : null,
          custom_currency:
            form.currency_code === CUSTOM_OPTION_VALUE
              ? form.currency_custom.trim() || null
              : null,
        },
      });

      navigate(`/finance/master-data/clients/${created.id}`);
    } catch (error) {
      console.error("Failed to create finance client:", error);
      setFormError(
        error instanceof Error ? error.message : "Failed to create client."
      );
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      <div className="mx-auto flex h-full w-full max-w-[1920px] min-h-0 flex-col gap-6 px-4 pb-4 pt-2 sm:px-6 xl:px-8">
        <section className="relative z-10 flex-shrink-0 overflow-hidden rounded-[30px] border border-white/10 bg-[linear-gradient(135deg,rgba(34,211,238,0.10),rgba(139,92,246,0.08),rgba(255,255,255,0.03))] backdrop-blur-xl">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.18),transparent_28%),radial-gradient(circle_at_top_right,rgba(139,92,246,0.16),transparent_26%),radial-gradient(circle_at_bottom_left,rgba(16,185,129,0.14),transparent_24%),radial-gradient(circle_at_bottom_right,rgba(244,63,94,0.10),transparent_24%)]" />

          <div className="relative flex items-center justify-between gap-4 px-5 py-5 sm:px-6 xl:px-7">
            <div className="min-w-0">
              <div className="inline-flex items-center rounded-full border border-cyan-400/20 bg-cyan-500/10 px-3 py-1 text-[11px] uppercase tracking-[0.22em] text-cyan-200">
                Master Data
              </div>

              <h1 className="mt-3 text-2xl font-semibold tracking-tight text-white sm:text-3xl">
                Create Client
              </h1>

              <div className="mt-2 text-sm text-white/50">
                Repeatable enterprise form with linked personnel, multi-contact,
                multi-address, and flexible finance defaults.
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-3">
              <Button
                variant="outline"
                onClick={() => navigate("/finance/master-data/clients")}
                className="h-11 rounded-2xl border-white/10 bg-white/5 px-4 text-white hover:bg-white/10"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Button>

              <Button
                variant="outline"
                onClick={() => void loadOptions()}
                className="h-11 rounded-2xl border-cyan-400/20 bg-cyan-500/10 px-4 text-cyan-100 hover:bg-cyan-500/20"
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Refresh
              </Button>
            </div>
          </div>
        </section>

        <div className="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto overflow-x-hidden pr-1 pb-2">
          <form className="space-y-6" onSubmit={handleSubmit}>
            <section>
              <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
                <Card className="overflow-hidden rounded-[26px] border border-cyan-400/15 bg-[linear-gradient(135deg,rgba(34,211,238,0.12),rgba(255,255,255,0.04))] backdrop-blur-xl">
                  <CardContent className="p-5">
                    <div className="text-xs uppercase tracking-[0.18em] text-cyan-100/70">
                      Client Code
                    </div>
                    <div className="mt-2 text-2xl font-semibold text-white">
                      Auto Generated
                    </div>
                    <div className="mt-2 text-sm text-white/55">
                      Assigned automatically when the client is created
                    </div>
                  </CardContent>
                </Card>

                <Card className="overflow-hidden rounded-[26px] border border-violet-400/15 bg-[linear-gradient(135deg,rgba(139,92,246,0.12),rgba(255,255,255,0.04))] backdrop-blur-xl">
                  <CardContent className="p-5">
                    <div className="text-xs uppercase tracking-[0.18em] text-violet-100/70">
                      Payment Terms
                    </div>
                    <div className="mt-2 text-2xl font-semibold text-white">
                      {selectedPaymentTermLabel}
                    </div>
                    <div className="mt-2 text-sm text-white/55">
                      Default client settlement behavior
                    </div>
                  </CardContent>
                </Card>

                <Card className="overflow-hidden rounded-[26px] border border-emerald-400/15 bg-[linear-gradient(135deg,rgba(16,185,129,0.12),rgba(255,255,255,0.04))] backdrop-blur-xl">
                  <CardContent className="p-5">
                    <div className="text-xs uppercase tracking-[0.18em] text-emerald-100/70">
                      Currency / Delivery
                    </div>
                    <div className="mt-2 text-2xl font-semibold text-white">
                      {selectedCurrencyLabel}
                    </div>
                    <div className="mt-2 text-sm text-white/55">
                      {selectedDeliveryTermLabel}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </section>

            <FormSection
              title="Basic Identity"
              description="Core client identity and status."
              icon={<Users className="h-5 w-5" />}
              accentClass="bg-[linear-gradient(135deg,rgba(34,211,238,0.18),rgba(59,130,246,0.10))] text-cyan-100"
            >
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                <div className="md:col-span-2">
                  <FieldLabel label="Legal Name" required />
                  <InputField
                    value={form.legal_name}
                    onChange={(event) =>
                      updateForm("legal_name", event.target.value)
                    }
                    placeholder="Enter legal company name"
                  />
                </div>

                <div>
                  <FieldLabel label="Status" />
                  <SelectField
                    value={form.status}
                    onChange={(event) =>
                      updateForm(
                        "status",
                        event.target.value as FormState["status"]
                      )
                    }
                  >
                    <option value="active" className="bg-slate-900">
                      Active
                    </option>
                    <option value="inactive" className="bg-slate-900">
                      Inactive
                    </option>
                    <option value="archived" className="bg-slate-900">
                      Archived
                    </option>
                  </SelectField>
                </div>
              </div>
            </FormSection>

            <FormSection
              title="Personnel"
              description="One client can have multiple related personnel, linked to employees or entered manually."
              icon={<Users className="h-5 w-5" />}
              accentClass="bg-[linear-gradient(135deg,rgba(139,92,246,0.18),rgba(34,211,238,0.10))] text-violet-100"
              actions={
                <AddButton
                  label="Add Personnel"
                  onClick={() =>
                    setForm((prev) => ({
                      ...prev,
                      personnel: [...prev.personnel, emptyPersonnelRow()],
                    }))
                  }
                />
              }
            >
              <div className="space-y-4">
                {form.personnel.map((row, index) => (
                  <div
                    key={row.id}
                    className="rounded-[24px] border border-white/10 bg-[linear-gradient(135deg,rgba(139,92,246,0.08),rgba(255,255,255,0.03))] p-4"
                  >
                    <div className="mb-4 flex items-center justify-between gap-4">
                      <div className="text-sm font-medium text-white">
                        Personnel {index + 1}
                      </div>
                      {form.personnel.length > 1 ? (
                        <RemoveButton
                          onClick={() =>
                            setForm((prev) => ({
                              ...prev,
                              personnel: prev.personnel.filter(
                                (item) => item.id !== row.id
                              ),
                            }))
                          }
                        />
                      ) : null}
                    </div>

                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
                      <div className="xl:col-span-2">
                        <FieldLabel label="Employee Picker" />
                        <SelectField
                          value={row.employee_user_id}
                          onChange={(event) => {
                            const selectedEmployee = employees.find(
                              (item) => item.id === event.target.value
                            );

                            updatePersonnelRow(row.id, (current) => ({
                              ...current,
                              employee_user_id: event.target.value,
                              employee_label: selectedEmployee?.label || "",
                              name: current.name || selectedEmployee?.label || "",
                              email: current.email || selectedEmployee?.email || "",
                            }));
                          }}
                          disabled={isLoadingOptions}
                        >
                          <option value="" className="bg-slate-900">
                            Select employee from system
                          </option>
                          {employees.map((employee) => (
                            <option
                              key={employee.id}
                              value={employee.id}
                              className="bg-slate-900"
                            >
                              {employee.label}
                            </option>
                          ))}
                        </SelectField>
                      </div>

                      <div>
                        <FieldLabel label="Name" />
                        <InputField
                          value={row.name}
                          onChange={(event) =>
                            updatePersonnelRow(row.id, (current) => ({
                              ...current,
                              name: event.target.value,
                            }))
                          }
                          placeholder="Manual personnel name"
                        />
                      </div>

                      <div>
                        <FieldLabel label="Role / Title" />
                        <InputField
                          value={row.role}
                          onChange={(event) =>
                            updatePersonnelRow(row.id, (current) => ({
                              ...current,
                              role: event.target.value,
                            }))
                          }
                          placeholder="Manager / Buyer / Owner"
                        />
                      </div>

                      <div>
                        <FieldLabel label="Email" />
                        <InputField
                          type="email"
                          value={row.email}
                          onChange={(event) =>
                            updatePersonnelRow(row.id, (current) => ({
                              ...current,
                              email: event.target.value,
                            }))
                          }
                          placeholder="person@email.com"
                        />
                      </div>

                      <div>
                        <FieldLabel label="Phone" />
                        <InputField
                          value={row.phone}
                          onChange={(event) =>
                            updatePersonnelRow(row.id, (current) => ({
                              ...current,
                              phone: event.target.value,
                            }))
                          }
                          placeholder="Phone"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </FormSection>

            <FormSection
              title="Communication"
              description="Add one or more communication channels for company or personnel."
              icon={<ChevronDown className="h-5 w-5" />}
              accentClass="bg-[linear-gradient(135deg,rgba(34,211,238,0.18),rgba(16,185,129,0.10))] text-cyan-100"
              actions={
                <AddButton
                  label="Add Communication"
                  onClick={() =>
                    setForm((prev) => ({
                      ...prev,
                      communications: [
                        ...prev.communications,
                        emptyCommunicationRow("other"),
                      ],
                    }))
                  }
                />
              }
            >
              <div className="space-y-4">
                {form.communications.map((row, index) => (
                  <div
                    key={row.id}
                    className="rounded-[24px] border border-white/10 bg-[linear-gradient(135deg,rgba(34,211,238,0.08),rgba(255,255,255,0.03))] p-4"
                  >
                    <div className="mb-4 flex items-center justify-between gap-4">
                      <div className="text-sm font-medium text-white">
                        Communication {index + 1}
                      </div>
                      {form.communications.length > 1 ? (
                        <RemoveButton
                          onClick={() =>
                            setForm((prev) => ({
                              ...prev,
                              communications: prev.communications.filter(
                                (item) => item.id !== row.id
                              ),
                            }))
                          }
                        />
                      ) : null}
                    </div>

                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                      <div>
                        <FieldLabel label="Label" />
                        <InputField
                          value={row.label}
                          onChange={(event) =>
                            updateCommunicationRow(row.id, (current) => ({
                              ...current,
                              label: event.target.value,
                            }))
                          }
                          placeholder="HQ / Sales / Support"
                        />
                      </div>

                      <div>
                        <FieldLabel label="Type" />
                        <SelectField
                          value={row.type}
                          onChange={(event) =>
                            updateCommunicationRow(row.id, (current) => ({
                              ...current,
                              type: event.target.value as CommunicationRow["type"],
                            }))
                          }
                        >
                          <option value="company" className="bg-slate-900">
                            Company
                          </option>
                          <option value="personnel" className="bg-slate-900">
                            Personnel
                          </option>
                          <option value="other" className="bg-slate-900">
                            Other
                          </option>
                        </SelectField>
                      </div>

                      <div>
                        <FieldLabel label="Email" />
                        <InputField
                          type="email"
                          value={row.email}
                          onChange={(event) =>
                            updateCommunicationRow(row.id, (current) => ({
                              ...current,
                              email: event.target.value,
                            }))
                          }
                          placeholder="email@domain.com"
                        />
                      </div>

                      <div>
                        <FieldLabel label="Phone" />
                        <InputField
                          value={row.phone}
                          onChange={(event) =>
                            updateCommunicationRow(row.id, (current) => ({
                              ...current,
                              phone: event.target.value,
                            }))
                          }
                          placeholder="Phone"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </FormSection>

            <FormSection
              title="Main Address"
              description="Primary billing and registration locations."
              icon={<ChevronDown className="h-5 w-5" />}
              accentClass="bg-[linear-gradient(135deg,rgba(16,185,129,0.18),rgba(34,211,238,0.10))] text-emerald-100"
              actions={
                <AddButton
                  label="Add Address"
                  onClick={() =>
                    setForm((prev) => ({
                      ...prev,
                      addresses: [...prev.addresses, emptyAddressRow()],
                    }))
                  }
                />
              }
            >
              <div className="space-y-4">
                {form.addresses.map((row, index) => (
                  <div
                    key={row.id}
                    className="rounded-[24px] border border-white/10 bg-[linear-gradient(135deg,rgba(16,185,129,0.08),rgba(255,255,255,0.03))] p-4"
                  >
                    <div className="mb-4 flex items-center justify-between gap-4">
                      <div className="text-sm font-medium text-white">
                        Address {index + 1}
                      </div>
                      {form.addresses.length > 1 ? (
                        <RemoveButton
                          onClick={() =>
                            setForm((prev) => ({
                              ...prev,
                              addresses: prev.addresses.filter(
                                (item) => item.id !== row.id
                              ),
                            }))
                          }
                        />
                      ) : null}
                    </div>

                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                      <div>
                        <FieldLabel label="Label" />
                        <InputField
                          value={row.label}
                          onChange={(event) =>
                            updateAddressRow(row.id, (current) => ({
                              ...current,
                              label: event.target.value,
                            }))
                          }
                          placeholder="Billing / Registered"
                        />
                      </div>

                      <div>
                        <FieldLabel label="Country" />
                        <InputField
                          value={row.country}
                          onChange={(event) =>
                            updateAddressRow(row.id, (current) => ({
                              ...current,
                              country: event.target.value,
                            }))
                          }
                          placeholder="Country"
                        />
                      </div>

                      <div className="xl:col-span-2">
                        <FieldLabel label="Address Line 1" />
                        <InputField
                          value={row.line1}
                          onChange={(event) =>
                            updateAddressRow(row.id, (current) => ({
                              ...current,
                              line1: event.target.value,
                            }))
                          }
                          placeholder="Street and number"
                        />
                      </div>

                      <div className="xl:col-span-2">
                        <FieldLabel label="Address Line 2" />
                        <InputField
                          value={row.line2}
                          onChange={(event) =>
                            updateAddressRow(row.id, (current) => ({
                              ...current,
                              line2: event.target.value,
                            }))
                          }
                          placeholder="Suite / floor / district"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </FormSection>

            <FormSection
              title="Shipping Address"
              description="Delivery locations if different from main address."
              icon={<ChevronDown className="h-5 w-5" />}
              accentClass="bg-[linear-gradient(135deg,rgba(245,158,11,0.18),rgba(244,63,94,0.10))] text-amber-100"
              actions={
                <AddButton
                  label="Add Shipping Address"
                  onClick={() =>
                    setForm((prev) => ({
                      ...prev,
                      shipping_addresses: [
                        ...prev.shipping_addresses,
                        emptyShippingAddressRow(),
                      ],
                    }))
                  }
                />
              }
            >
              <div className="space-y-4">
                {form.shipping_addresses.map((row, index) => (
                  <div
                    key={row.id}
                    className="rounded-[24px] border border-white/10 bg-[linear-gradient(135deg,rgba(245,158,11,0.08),rgba(255,255,255,0.03))] p-4"
                  >
                    <div className="mb-4 flex items-center justify-between gap-4">
                      <div className="text-sm font-medium text-white">
                        Shipping Address {index + 1}
                      </div>
                      {form.shipping_addresses.length > 1 ? (
                        <RemoveButton
                          onClick={() =>
                            setForm((prev) => ({
                              ...prev,
                              shipping_addresses: prev.shipping_addresses.filter(
                                (item) => item.id !== row.id
                              ),
                            }))
                          }
                        />
                      ) : null}
                    </div>

                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                      <div>
                        <FieldLabel label="Label" />
                        <InputField
                          value={row.label}
                          onChange={(event) =>
                            updateShippingAddressRow(row.id, (current) => ({
                              ...current,
                              label: event.target.value,
                            }))
                          }
                          placeholder="Warehouse / Delivery point"
                        />
                      </div>

                      <div>
                        <FieldLabel label="Country" />
                        <InputField
                          value={row.country}
                          onChange={(event) =>
                            updateShippingAddressRow(row.id, (current) => ({
                              ...current,
                              country: event.target.value,
                            }))
                          }
                          placeholder="Country"
                        />
                      </div>

                      <div className="xl:col-span-2">
                        <FieldLabel label="Address Line 1" />
                        <InputField
                          value={row.line1}
                          onChange={(event) =>
                            updateShippingAddressRow(row.id, (current) => ({
                              ...current,
                              line1: event.target.value,
                            }))
                          }
                          placeholder="Street and number"
                        />
                      </div>

                      <div className="xl:col-span-2">
                        <FieldLabel label="Address Line 2" />
                        <InputField
                          value={row.line2}
                          onChange={(event) =>
                            updateShippingAddressRow(row.id, (current) => ({
                              ...current,
                              line2: event.target.value,
                            }))
                          }
                          placeholder="Suite / floor / district"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </FormSection>

            <FormSection
              title="Finance Defaults"
              description="Choose from system options or switch to custom values."
              icon={<ChevronDown className="h-5 w-5" />}
              accentClass="bg-[linear-gradient(135deg,rgba(244,63,94,0.18),rgba(139,92,246,0.10))] text-rose-100"
            >
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                <div className="rounded-[22px] border border-white/10 bg-[linear-gradient(135deg,rgba(139,92,246,0.08),rgba(255,255,255,0.03))] p-4">
                  <FieldLabel label="Payment Terms" />
                  <SelectField
                    value={form.payment_terms_id}
                    onChange={(event) =>
                      updateForm("payment_terms_id", event.target.value)
                    }
                    disabled={isLoadingOptions}
                  >
                    <option value="" className="bg-slate-900">
                      Select payment term
                    </option>
                    {paymentTerms.map((item) => (
                      <option
                        key={item.id}
                        value={item.id}
                        className="bg-slate-900"
                      >
                        {item.code} • {item.name} ({item.due_days} days)
                      </option>
                    ))}
                    <option value={CUSTOM_OPTION_VALUE} className="bg-slate-900">
                      Custom payment term
                    </option>
                  </SelectField>

                  {form.payment_terms_id === CUSTOM_OPTION_VALUE ? (
                    <div className="mt-3">
                      <InputField
                        value={form.payment_terms_custom}
                        onChange={(event) =>
                          updateForm("payment_terms_custom", event.target.value)
                        }
                        placeholder="Write custom payment term"
                      />
                    </div>
                  ) : null}
                </div>

                <div className="rounded-[22px] border border-white/10 bg-[linear-gradient(135deg,rgba(34,211,238,0.08),rgba(255,255,255,0.03))] p-4">
                  <FieldLabel label="Delivery Term" />
                  <SelectField
                    value={form.delivery_term}
                    onChange={(event) =>
                      updateForm("delivery_term", event.target.value)
                    }
                    disabled={isLoadingOptions}
                  >
                    <option value="" className="bg-slate-900">
                      Select delivery term
                    </option>
                    {deliveryTerms.map((item) => (
                      <option
                        key={item.id}
                        value={item.name}
                        className="bg-slate-900"
                      >
                        {item.code} • {item.name}
                      </option>
                    ))}
                    <option value={CUSTOM_OPTION_VALUE} className="bg-slate-900">
                      Custom delivery term
                    </option>
                  </SelectField>

                  {form.delivery_term === CUSTOM_OPTION_VALUE ? (
                    <div className="mt-3">
                      <InputField
                        value={form.delivery_term_custom}
                        onChange={(event) =>
                          updateForm("delivery_term_custom", event.target.value)
                        }
                        placeholder="Write custom delivery term"
                      />
                    </div>
                  ) : null}
                </div>

                <div className="rounded-[22px] border border-white/10 bg-[linear-gradient(135deg,rgba(16,185,129,0.08),rgba(255,255,255,0.03))] p-4">
                  <FieldLabel label="Currency" />
                  <SelectField
                    value={form.currency_code}
                    onChange={(event) =>
                      updateForm("currency_code", event.target.value)
                    }
                    disabled={isLoadingOptions}
                  >
                    <option value="" className="bg-slate-900">
                      Select currency
                    </option>
                    {currencies.map((item) => (
                      <option
                        key={item.id}
                        value={item.currency_code}
                        className="bg-slate-900"
                      >
                        {item.currency_code} • {item.currency_name}
                      </option>
                    ))}
                    <option value={CUSTOM_OPTION_VALUE} className="bg-slate-900">
                      Custom currency
                    </option>
                  </SelectField>

                  {form.currency_code === CUSTOM_OPTION_VALUE ? (
                    <div className="mt-3">
                      <InputField
                        value={form.currency_custom}
                        onChange={(event) =>
                          updateForm("currency_custom", event.target.value)
                        }
                        placeholder="Write custom currency"
                      />
                    </div>
                  ) : null}
                </div>
              </div>
            </FormSection>

            <FormSection
              title="Notes"
              description="Internal notes and finance-side references."
              icon={<ChevronDown className="h-5 w-5" />}
              accentClass="bg-[linear-gradient(135deg,rgba(99,102,241,0.18),rgba(34,211,238,0.10))] text-indigo-100"
            >
              <div>
                <FieldLabel label="Notes" />
                <TextareaField
                  value={form.notes}
                  onChange={(event) => updateForm("notes", event.target.value)}
                  placeholder="Add internal finance notes"
                />
              </div>
            </FormSection>

            <section>
              <Card className="overflow-hidden rounded-[28px] border border-white/10 bg-[linear-gradient(135deg,rgba(34,211,238,0.08),rgba(139,92,246,0.08),rgba(255,255,255,0.03))] backdrop-blur-xl">
                <CardContent className="p-5">
                  <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                    <div>
                      <div className="text-base font-semibold text-white">
                        Ready to create client
                      </div>
                      <div className="mt-1 text-sm text-white/50">
                        Client code and created date will be assigned automatically.
                      </div>
                      {formError ? (
                        <div className="mt-3 text-sm text-rose-300">
                          {formError}
                        </div>
                      ) : null}
                    </div>

                    <div className="flex flex-wrap gap-3">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => navigate("/finance/master-data/clients")}
                        className="h-11 rounded-2xl border-white/10 bg-white/5 px-4 text-white hover:bg-white/10"
                      >
                        Cancel
                      </Button>

                      <Button
                        type="submit"
                        variant="outline"
                        disabled={isSaving}
                        className="h-11 rounded-2xl border-emerald-400/20 bg-emerald-500/10 px-4 text-emerald-100 hover:bg-emerald-500/20"
                      >
                        <Save className="mr-2 h-4 w-4" />
                        {isSaving ? "Saving..." : "Save Client"}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </section>
          </form>
        </div>
      </div>
    </div>
  );
}
