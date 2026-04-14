import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, RefreshCw, Save } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";

import {
  createBankAccount,
  getCompanyOptions,
  type CompanyOption,
} from "@/lib/finance/bankAccounts";

type FormState = {
  company_id: string;
  company_code: string;
  beneficiary_name: string;
  bank_name: string;
  country: string;
  city: string;
  postal_code: string;
  address_line_1: string;
  address_line_2: string;
  account_number: string;
  account_identifier_type: string;
  account_identifier_value: string;
  currency_code: string;
  is_default: boolean;
  status: "active" | "inactive" | "archived";
  notes: string;
};

const EMPTY_FORM: FormState = {
  company_id: "",
  company_code: "",
  beneficiary_name: "",
  bank_name: "",
  country: "",
  city: "",
  postal_code: "",
  address_line_1: "",
  address_line_2: "",
  account_number: "",
  account_identifier_type: "swift",
  account_identifier_value: "",
  currency_code: "",
  is_default: false,
  status: "active",
  notes: "",
};

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
      className={`h-11 rounded-2xl border-white/10 bg-white/5 text-white placeholder:text-white/30 ${
        props.className ?? ""
      }`}
    />
  );
}

function TextareaField(
  props: React.TextareaHTMLAttributes<HTMLTextAreaElement>
) {
  return (
    <textarea
      {...props}
      className={`min-h-[110px] w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none placeholder:text-white/30 ${
        props.className ?? ""
      }`}
    />
  );
}

function FormSection({
  title,
  description,
  children,
  fullWidth = false,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
  fullWidth?: boolean;
}) {
  return (
    <Card
      className={`overflow-hidden rounded-[24px] border border-white/10 bg-[linear-gradient(135deg,rgba(255,255,255,0.06),rgba(255,255,255,0.03))] backdrop-blur-xl shadow-[0_20px_60px_rgba(0,0,0,0.24)] ${
        fullWidth ? "lg:col-span-2" : ""
      }`}
    >
      <CardHeader className="border-b border-white/8 px-5 py-4">
        <div>
          <CardTitle className="text-white">{title}</CardTitle>
          <CardDescription className="mt-1 text-white/45">
            {description}
          </CardDescription>
        </div>
      </CardHeader>

      <CardContent className="p-4">{children}</CardContent>
    </Card>
  );
}

export default function FinanceMasterDataBankAccountCreatePage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [companies, setCompanies] = useState<CompanyOption[]>([]);
  const [isLoadingCompanies, setIsLoadingCompanies] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    async function loadCompanies() {
      try {
        setIsLoadingCompanies(true);
        const rows = await getCompanyOptions();
        setCompanies(rows);

        const companyIdFromUrl = searchParams.get("company_id");
        if (!companyIdFromUrl) return;

        const company =
          rows.find((item) => item.id === companyIdFromUrl) ?? null;

        if (!company) return;

        setForm((prev) => ({
          ...prev,
          company_id: companyIdFromUrl,
          company_code: company.code ?? "",
          beneficiary_name:
            company.legal_name?.trim() || company.name || "",
          currency_code: prev.currency_code || company.currency_code || "",
        }));
      } catch (error) {
        console.error("Failed to load companies:", error);
        setCompanies([]);
      } finally {
        setIsLoadingCompanies(false);
      }
    }

    void loadCompanies();
  }, [searchParams]);

  const selectedCompany = useMemo(() => {
    return companies.find((c) => c.id === form.company_id) ?? null;
  }, [companies, form.company_id]);

  const identifierLabel = useMemo(() => {
    return form.account_identifier_type.toLowerCase() === "iban"
      ? "IBAN Value"
      : "SWIFT Value";
  }, [form.account_identifier_type]);


  function updateForm<K extends keyof FormState>(
    key: K,
    value: FormState[K]
  ) {
    setForm((prev) => ({
      ...prev,
      [key]: value,
    }));
  }

  function handleCompanyChange(companyId: string) {
    const company = companies.find((c) => c.id === companyId) ?? null;

    setForm((prev) => ({
      ...prev,
      company_id: companyId,
      company_code: company?.code ?? "",
      beneficiary_name:
        company?.legal_name?.trim() || company?.name || "",
      currency_code: prev.currency_code || company?.currency_code || "",
    }));
  }

  function handleReset() {
    setForm(EMPTY_FORM);
    setFormError(null);
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!form.company_id) {
      setFormError("Company is required.");
      return;
    }

    if (!form.bank_name.trim()) {
      setFormError("Bank name is required.");
      return;
    }

    try {
      setIsSaving(true);
      setFormError(null);

      const created = await createBankAccount({
        company_id: form.company_id,
        beneficiary_name: form.beneficiary_name.trim() || null,
        bank_name: form.bank_name.trim() || null,
        country: form.country.trim() || null,
        city: form.city.trim() || null,
        postal_code: form.postal_code.trim() || null,
        address_line_1: form.address_line_1.trim() || null,
        address_line_2: form.address_line_2.trim() || null,
        account_number: form.account_number.trim() || null,
        account_identifier_type:
          form.account_identifier_type.trim() || null,
        account_identifier_value:
          form.account_identifier_value.trim() || null,
        currency_code: form.currency_code.trim() || null,
        is_default: form.is_default,
        status: form.status,
        notes: form.notes.trim() || null,
      });

      navigate(`/finance/master-data/companies/${form.company_id}`, {
  state: {
    refreshCompanyBankAccounts: true,
    createdBankAccountId: created.id,
  },
});
    } catch (error) {
      console.error("Failed to create bank account:", error);
      setFormError(
        error instanceof Error
          ? error.message
          : "Failed to create bank account."
      );
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      <div className="mx-auto flex h-full w-full max-w-[1920px] min-h-0 flex-col gap-6 px-4 pb-4 pt-2 sm:px-6 xl:px-8">

        {/* HEADER */}
        <section className="relative z-10 flex-shrink-0 overflow-hidden rounded-[30px] border border-white/10 bg-[linear-gradient(135deg,rgba(34,211,238,0.10),rgba(139,92,246,0.08),rgba(255,255,255,0.03))] backdrop-blur-xl">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.18),transparent_28%),radial-gradient(circle_at_top_right,rgba(139,92,246,0.16),transparent_26%),radial-gradient(circle_at_bottom_left,rgba(16,185,129,0.14),transparent_24%),radial-gradient(circle_at_bottom_right,rgba(244,63,94,0.10),transparent_24%)]" />

          <div className="relative flex items-center justify-between gap-4 px-5 py-5 sm:px-6 xl:px-7">
            <div className="min-w-0">
              <div className="inline-flex items-center rounded-full border border-cyan-400/20 bg-cyan-500/10 px-3 py-1 text-[11px] uppercase tracking-[0.22em] text-cyan-200">
                Master Data
              </div>

              <h1 className="mt-3 text-2xl font-semibold tracking-tight text-white sm:text-3xl">
                Create Company Bank Account
              </h1>

              <div className="mt-2 text-sm text-white/50">
                Company selection, bank details, identifier, currency, control,
                and notes.
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-3">
              <Button
                variant="outline"
                onClick={() => navigate("/finance/master-data/bank-accounts")}
                className="h-11 rounded-2xl border-white/10 bg-white/5 px-4 text-white hover:bg-white/10"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Button>

              <Button
                type="button"
                variant="outline"
                onClick={handleReset}
                className="h-11 rounded-2xl border-white/10 bg-white/5 px-4 text-white hover:bg-white/10"
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Reset
              </Button>

              <Button
                type="submit"
                form="bank-account-create-form"
                variant="outline"
                disabled={isSaving}
                className="h-11 rounded-2xl border-white/10 bg-white/5 px-4 text-white hover:bg-white/10"
              >
                <Save className="mr-2 h-4 w-4" />
                {isSaving ? "Saving..." : "Create Bank Account"}
              </Button>
            </div>
          </div>
        </section>

                <div className="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto overflow-x-hidden pr-1 pb-2">
          <form
            id="bank-account-create-form"
            className="flex min-h-0 flex-col gap-6"
            onSubmit={handleSubmit}
          >
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">

              {/* COMPANY */}
              <FormSection
                title="Section 1 — Company Link"
                description="Select the company and pull linked finance identity."
              >
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  <div className="md:col-span-2">
                    <FieldLabel label="Company" required />
                    <select
                      value={form.company_id}
                      onChange={(e) => handleCompanyChange(e.target.value)}
                      className="h-11 w-full rounded-2xl border border-white/10 bg-white/5 px-4 text-sm text-white outline-none"
                    >
                      <option value="">
                        {isLoadingCompanies
                          ? "Loading companies..."
                          : "Select company"}
                      </option>
                      {companies.map((c) => (
                        <option key={c.id} value={c.id}>
                          {(c.legal_name?.trim() || c.name) +
                            (c.code ? ` • ${c.code}` : "")}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <FieldLabel label="Company Code" />
                    <div className="flex h-11 items-center rounded-2xl border border-white/10 bg-white/5 px-4 text-sm text-white/70">
                      {form.company_code || "Auto from company"}
                    </div>
                  </div>

                  <div>
                    <FieldLabel label="Beneficiary Name" required />
                    <InputField
                      value={form.beneficiary_name}
                      onChange={(e) =>
                        updateForm("beneficiary_name", e.target.value)
                      }
                      placeholder="Auto from company, can edit"
                    />
                  </div>

                  <div>
                    <FieldLabel label="Company Currency" />
                    <div className="flex h-11 items-center rounded-2xl border border-white/10 bg-white/5 px-4 text-sm text-white/70">
                      {selectedCompany?.currency_code || "—"}
                    </div>
                  </div>
                </div>
              </FormSection>

              {/* BANK */}
              <FormSection
                title="Section 2 — Bank Identity"
                description="Bank name and main account number."
              >
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  <div className="md:col-span-2">
                    <FieldLabel label="Bank Name" required />
                    <InputField
                      value={form.bank_name}
                      onChange={(e) =>
                        updateForm("bank_name", e.target.value)
                      }
                      placeholder="Bank name"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <FieldLabel label="Account Number" />
                    <InputField
                      value={form.account_number}
                      onChange={(e) =>
                        updateForm("account_number", e.target.value)
                      }
                      placeholder="Account number"
                    />
                  </div>
                </div>
              </FormSection>

              {/* ADDRESS */}
              <FormSection
                title="Section 3 — Bank Address"
                description="Address details for this bank account."
              >
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  <div>
                    <FieldLabel label="Country" />
                    <InputField
                      value={form.country}
                      onChange={(e) =>
                        updateForm("country", e.target.value)
                      }
                      placeholder="Country"
                    />
                  </div>

                  <div>
                    <FieldLabel label="City" />
                    <InputField
                      value={form.city}
                      onChange={(e) =>
                        updateForm("city", e.target.value)
                      }
                      placeholder="City"
                    />
                  </div>

                  <div>
                    <FieldLabel label="ZIP / Postal Code" />
                    <InputField
                      value={form.postal_code}
                      onChange={(e) =>
                        updateForm("postal_code", e.target.value)
                      }
                      placeholder="Postal code"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <FieldLabel label="Address Line 1" />
                    <InputField
                      value={form.address_line_1}
                      onChange={(e) =>
                        updateForm("address_line_1", e.target.value)
                      }
                      placeholder="Address line 1"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <FieldLabel label="Address Line 2" />
                    <InputField
                      value={form.address_line_2}
                      onChange={(e) =>
                        updateForm("address_line_2", e.target.value)
                      }
                      placeholder="Address line 2"
                    />
                  </div>
                </div>
              </FormSection>

              {/* CONTROL */}
              <FormSection
                title="Section 4 — Identifier / Currency / Control"
                description="Identifier type, currency, default flag, and lifecycle."
              >
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  <div>
                    <FieldLabel label="Identifier Type" />
                    <InputField
                      list="identifier-type-options"
                      value={form.account_identifier_type}
                      onChange={(e) =>
                        updateForm(
                          "account_identifier_type",
                          e.target.value
                        )
                      }
                      placeholder="swift or iban"
                    />
                    <datalist id="identifier-type-options">
                      <option value="swift" />
                      <option value="iban" />
                    </datalist>
                  </div>

                  <div>
                    <FieldLabel label={identifierLabel} />
                    <InputField
                      value={form.account_identifier_value}
                      onChange={(e) =>
                        updateForm(
                          "account_identifier_value",
                          e.target.value
                        )
                      }
                      placeholder="Identifier value"
                    />
                  </div>

                  <div>
                    <FieldLabel label="Currency Code" />
                    <InputField
                      list="currency-code-options"
                      value={form.currency_code}
                      onChange={(e) =>
                        updateForm(
                          "currency_code",
                          e.target.value.toUpperCase()
                        )
                      }
                      placeholder="USD / EUR / CNY / ILS"
                    />
                    <datalist id="currency-code-options">
                      <option value="USD" />
                      <option value="EUR" />
                      <option value="CNY" />
                      <option value="ILS" />
                    </datalist>
                  </div>

                  <div>
                    <FieldLabel label="Status" />
                    <InputField
                      list="status-options"
                      value={form.status}
                      onChange={(e) =>
                        updateForm(
                          "status",
                          e.target.value as FormState["status"]
                        )
                      }
                      placeholder="active / inactive / archived"
                    />
                    <datalist id="status-options">
                      <option value="active" />
                      <option value="inactive" />
                      <option value="archived" />
                    </datalist>
                  </div>

                  <div className="md:col-span-2">
                    <label className="flex items-center gap-3 text-sm text-white/75">
                      <input
                        type="checkbox"
                        checked={form.is_default}
                        onChange={(e) =>
                          updateForm("is_default", e.target.checked)
                        }
                      />
                      Set as default bank account for this company
                    </label>
                  </div>
                </div>
              </FormSection>

              {/* NOTES */}
              <FormSection
                title="Section 5 — Notes"
                description="Internal notes."
                fullWidth
              >
                <TextareaField
                  value={form.notes}
                  onChange={(e) =>
                    updateForm("notes", e.target.value)
                  }
                  placeholder="Notes..."
                />
              </FormSection>
            </div>

            {formError ? (
              <div className="rounded-2xl border border-rose-400/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
                {formError}
              </div>
            ) : null}
          </form>
        </div>
      </div>
    </div>
  );
}
