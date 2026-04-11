import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, RefreshCw, Save } from "lucide-react";

import { supabase } from "@/lib/supabase";
import { createClient } from "@/lib/finance/clients";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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

type FormState = {
  legal_name: string;
  contact_name: string;
  company_related_personnel: string;
  status: "active" | "inactive" | "archived";
  company_email: string;
  personnel_email: string;
  company_phone: string;
  personnel_phone: string;
  country: string;
  address_line_1: string;
  address_line_2: string;
  shipping_address_line_1: string;
  shipping_address_line_2: string;
  payment_terms_id: string;
  delivery_term: string;
  currency_code: string;
  notes: string;
};

const EMPTY_FORM: FormState = {
  legal_name: "",
  contact_name: "",
  company_related_personnel: "",
  status: "active",
  company_email: "",
  personnel_email: "",
  company_phone: "",
  personnel_phone: "",
  country: "",
  address_line_1: "",
  address_line_2: "",
  shipping_address_line_1: "",
  shipping_address_line_2: "",
  payment_terms_id: "",
  delivery_term: "",
  currency_code: "",
  notes: "",
};

function FormSection({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <Card className="overflow-hidden rounded-[28px] border border-white/10 bg-white/[0.045] backdrop-blur-xl">
      <CardHeader className="border-b border-white/8 pb-4">
        <CardTitle className="text-white">{title}</CardTitle>
        <CardDescription className="text-white/45">
          {description}
        </CardDescription>
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

export default function FinanceMasterDataClientCreatePage() {
  const navigate = useNavigate();

  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [paymentTerms, setPaymentTerms] = useState<PaymentTermOption[]>([]);
  const [currencies, setCurrencies] = useState<CurrencyOption[]>([]);
  const [deliveryTerms, setDeliveryTerms] = useState<DeliveryTermOption[]>([]);
  const [isLoadingOptions, setIsLoadingOptions] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const loadOptions = useCallback(async () => {
    setIsLoadingOptions(true);

    try {
      const [paymentTermsResult, currenciesResult, deliveryTermsResult] =
        await Promise.all([
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
        ]);

      const nextPaymentTerms = (paymentTermsResult.data ??
        []) as PaymentTermOption[];
      const nextCurrencies = (currenciesResult.data ?? []) as CurrencyOption[];
      const nextDeliveryTerms = (deliveryTermsResult.data ??
        []) as DeliveryTermOption[];

      setPaymentTerms(nextPaymentTerms);
      setCurrencies(nextCurrencies);
      setDeliveryTerms(nextDeliveryTerms);

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
          prev.delivery_term ||
          nextDeliveryTerms[0]?.name ||
          "",
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
    return (
      paymentTerms.find((item) => item.id === form.payment_terms_id)?.name || "—"
    );
  }, [form.payment_terms_id, paymentTerms]);

  const selectedCurrencyLabel = useMemo(() => {
    const selected = currencies.find(
      (item) => item.currency_code === form.currency_code
    );
    return selected
      ? `${selected.currency_code} • ${selected.currency_name}`
      : "—";
  }, [currencies, form.currency_code]);

  const selectedDeliveryTermLabel = useMemo(() => {
    return form.delivery_term || "—";
  }, [form.delivery_term]);

  function updateForm<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({
      ...prev,
      [key]: value,
    }));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmedLegalName = form.legal_name.trim();
    if (!trimmedLegalName) {
      setFormError("Legal name is required.");
      return;
    }

    try {
      setIsSaving(true);
      setFormError(null);

      const created = await createClient({
        legal_name: trimmedLegalName,
        contact_name: form.contact_name || null,
        company_related_personnel: form.company_related_personnel || null,
        status: form.status,
        company_email: form.company_email || null,
        personnel_email: form.personnel_email || null,
        company_phone: form.company_phone || null,
        personnel_phone: form.personnel_phone || null,
        country: form.country || null,
        address_line_1: form.address_line_1 || null,
        address_line_2: form.address_line_2 || null,
        shipping_address_line_1: form.shipping_address_line_1 || null,
        shipping_address_line_2: form.shipping_address_line_2 || null,
        payment_terms_id: form.payment_terms_id || null,
        delivery_term: form.delivery_term || null,
        currency_code: form.currency_code || null,
        notes: form.notes || null,
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
        <section className="relative z-10 flex-shrink-0 rounded-[30px] border border-white/10 bg-[linear-gradient(135deg,rgba(255,255,255,0.08),rgba(255,255,255,0.03))] backdrop-blur-xl">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.10),transparent_32%),radial-gradient(circle_at_top_right,rgba(59,130,246,0.12),transparent_26%),radial-gradient(circle_at_bottom_left,rgba(16,185,129,0.10),transparent_24%)]" />

          <div className="relative flex items-center justify-between gap-4 px-5 py-5 sm:px-6 xl:px-7">
            <div className="min-w-0">
              <div className="inline-flex items-center rounded-full border border-cyan-400/15 bg-cyan-500/10 px-3 py-1 text-[11px] uppercase tracking-[0.22em] text-cyan-200">
                Master Data
              </div>

              <h1 className="mt-3 text-2xl font-semibold tracking-tight text-white sm:text-3xl">
                Create Client
              </h1>

              <div className="mt-2 text-sm text-white/45">
                Create a new finance client with contact, address, and finance
                defaults.
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
                className="h-11 rounded-2xl border-white/10 bg-white/5 px-4 text-white hover:bg-white/10"
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
                <Card className="overflow-hidden rounded-[26px] border border-white/10 bg-white/[0.045] backdrop-blur-xl">
                  <CardContent className="p-5">
                    <div className="text-xs uppercase tracking-[0.18em] text-white/35">
                      Client Code
                    </div>
                    <div className="mt-2 text-2xl font-semibold text-white">
                      Auto Generated
                    </div>
                    <div className="mt-2 text-sm text-white/50">
                      Assigned automatically when the client is created
                    </div>
                  </CardContent>
                </Card>

                <Card className="overflow-hidden rounded-[26px] border border-white/10 bg-white/[0.045] backdrop-blur-xl">
                  <CardContent className="p-5">
                    <div className="text-xs uppercase tracking-[0.18em] text-white/35">
                      Payment Terms
                    </div>
                    <div className="mt-2 text-2xl font-semibold text-white">
                      {selectedPaymentTermLabel}
                    </div>
                    <div className="mt-2 text-sm text-white/50">
                      Default client settlement behavior
                    </div>
                  </CardContent>
                </Card>

                <Card className="overflow-hidden rounded-[26px] border border-white/10 bg-white/[0.045] backdrop-blur-xl">
                  <CardContent className="p-5">
                    <div className="text-xs uppercase tracking-[0.18em] text-white/35">
                      Currency / Delivery
                    </div>
                    <div className="mt-2 text-2xl font-semibold text-white">
                      {selectedCurrencyLabel}
                    </div>
                    <div className="mt-2 text-sm text-white/50">
                      {selectedDeliveryTermLabel}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </section>

            <FormSection
              title="Basic Identity"
              description="Core client identity and status."
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
                  <FieldLabel label="Contact Name" />
                  <InputField
                    value={form.contact_name}
                    onChange={(event) =>
                      updateForm("contact_name", event.target.value)
                    }
                    placeholder="Main contact"
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

                <div className="md:col-span-2">
                  <FieldLabel label="Company Related Personnel" />
                  <InputField
                    value={form.company_related_personnel}
                    onChange={(event) =>
                      updateForm("company_related_personnel", event.target.value)
                    }
                    placeholder="Account manager / relevant personnel"
                  />
                </div>
              </div>
            </FormSection>

            <FormSection
              title="Communication"
              description="Company and personnel communication details."
            >
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                <div>
                  <FieldLabel label="Company Email" />
                  <InputField
                    type="email"
                    value={form.company_email}
                    onChange={(event) =>
                      updateForm("company_email", event.target.value)
                    }
                    placeholder="company@email.com"
                  />
                </div>

                <div>
                  <FieldLabel label="Personnel Email" />
                  <InputField
                    type="email"
                    value={form.personnel_email}
                    onChange={(event) =>
                      updateForm("personnel_email", event.target.value)
                    }
                    placeholder="person@email.com"
                  />
                </div>

                <div>
                  <FieldLabel label="Company Phone" />
                  <InputField
                    value={form.company_phone}
                    onChange={(event) =>
                      updateForm("company_phone", event.target.value)
                    }
                    placeholder="Company phone"
                  />
                </div>

                <div>
                  <FieldLabel label="Personnel Phone" />
                  <InputField
                    value={form.personnel_phone}
                    onChange={(event) =>
                      updateForm("personnel_phone", event.target.value)
                    }
                    placeholder="Personnel phone"
                  />
                </div>
              </div>
            </FormSection>

            <FormSection
              title="Main Address"
              description="Primary billing and registration location."
            >
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                <div>
                  <FieldLabel label="Country" />
                  <InputField
                    value={form.country}
                    onChange={(event) =>
                      updateForm("country", event.target.value)
                    }
                    placeholder="Country"
                  />
                </div>

                <div className="md:col-span-2">
                  <FieldLabel label="Address Line 1" />
                  <InputField
                    value={form.address_line_1}
                    onChange={(event) =>
                      updateForm("address_line_1", event.target.value)
                    }
                    placeholder="Street and number"
                  />
                </div>

                <div>
                  <FieldLabel label="Address Line 2" />
                  <InputField
                    value={form.address_line_2}
                    onChange={(event) =>
                      updateForm("address_line_2", event.target.value)
                    }
                    placeholder="Suite / floor / district"
                  />
                </div>
              </div>
            </FormSection>

            <FormSection
              title="Shipping Address"
              description="Delivery location if different from main address."
            >
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <FieldLabel label="Shipping Address Line 1" />
                  <InputField
                    value={form.shipping_address_line_1}
                    onChange={(event) =>
                      updateForm("shipping_address_line_1", event.target.value)
                    }
                    placeholder="Shipping street and number"
                  />
                </div>

                <div>
                  <FieldLabel label="Shipping Address Line 2" />
                  <InputField
                    value={form.shipping_address_line_2}
                    onChange={(event) =>
                      updateForm("shipping_address_line_2", event.target.value)
                    }
                    placeholder="Suite / floor / district"
                  />
                </div>
              </div>
            </FormSection>

            <FormSection
              title="Finance Defaults"
              description="Default terms used across finance operations."
            >
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                <div>
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
                        {item.name} ({item.due_days} days)
                      </option>
                    ))}
                  </SelectField>
                </div>

                <div>
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
                  </SelectField>
                </div>

                <div>
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
                  </SelectField>
                </div>
              </div>
            </FormSection>

            <FormSection
              title="Notes"
              description="Internal notes and finance-side references."
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
              <Card className="overflow-hidden rounded-[28px] border border-white/10 bg-white/[0.045] backdrop-blur-xl">
                <CardContent className="p-5">
                  <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                    <div>
                      <div className="text-base font-semibold text-white">
                        Ready to create client
                      </div>
                      <div className="mt-1 text-sm text-white/50">
                        Client code and created date will be assigned
                        automatically.
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
                        className="h-11 rounded-2xl border-white/10 bg-white/5 px-4 text-white hover:bg-white/10"
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
