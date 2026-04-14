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
      className={`rounded-[24px] border border-white/10 bg-white/[0.045] ${
        fullWidth ? "lg:col-span-2" : ""
      }`}
    >
      <CardHeader>
        <CardTitle className="text-white">{title}</CardTitle>
        <CardDescription className="text-white/45">
          {description}
        </CardDescription>
      </CardHeader>
      <CardContent>{children}</CardContent>
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
    if (form.account_identifier_type.trim().toLowerCase() === "iban") {
      return "IBAN Value";
    }
    return "SWIFT Value";
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

      navigate(`/finance/master-data`, {
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
    <div className="flex h-full flex-col">
      <div className="mx-auto w-full max-w-[1600px] p-6 space-y-6">

        {/* HEADER */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl text-white font-semibold">
              Create Company Bank Account
            </h1>
            <div className="text-white/50 text-sm">
              Company linkage, bank details, identifier, and control settings.
            </div>
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => navigate("/finance/master-data/bank-accounts")}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>

            <Button variant="outline" onClick={handleReset}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Reset
            </Button>

            <Button
              type="submit"
              form="bank-account-form"
              disabled={isSaving}
            >
              <Save className="mr-2 h-4 w-4" />
              {isSaving ? "Saving..." : "Create"}
            </Button>
          </div>
        </div>

        {/* FORM */}
        <form
          id="bank-account-form"
          onSubmit={handleSubmit}
          className="grid grid-cols-1 lg:grid-cols-2 gap-6"
        >

          {/* COMPANY */}
          <FormSection
            title="Company Link"
            description="Select company and auto-fill identity"
          >
            <div className="space-y-3">
              <div>
                <FieldLabel label="Company" required />
                <select
                  value={form.company_id}
                  onChange={(e) => handleCompanyChange(e.target.value)}
                  className="w-full h-11 rounded-2xl bg-white/5 border border-white/10 text-white px-4"
                >
                  <option value="">
                    {isLoadingCompanies ? "Loading..." : "Select company"}
                  </option>
                  {companies.map((c) => (
                    <option key={c.id} value={c.id}>
                      {(c.legal_name || c.name) +
                        (c.code ? ` • ${c.code}` : "")}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <FieldLabel label="Company Code" />
                <div className="h-11 flex items-center px-4 rounded-2xl bg-white/5 border border-white/10 text-white/70">
                  {form.company_code || "Auto"}
                </div>
              </div>

              <div>
                <FieldLabel label="Beneficiary Name" required />
                <InputField
                  value={form.beneficiary_name}
                  onChange={(e) =>
                    updateForm("beneficiary_name", e.target.value)
                  }
                />
              </div>

              <div>
                <FieldLabel label="Currency" />
                <div className="h-11 flex items-center px-4 rounded-2xl bg-white/5 border border-white/10 text-white/70">
                  {selectedCompany?.currency_code || "—"}
                </div>
              </div>
            </div>
          </FormSection>

          {/* BANK */}
          <FormSection
            title="Bank Identity"
            description="Main bank account details"
          >
            <div className="space-y-3">
              <div>
                <FieldLabel label="Bank Name" required />
                <InputField
                  value={form.bank_name}
                  onChange={(e) =>
                    updateForm("bank_name", e.target.value)
                  }
                />
              </div>

              <div>
                <FieldLabel label="Account Number" />
                <InputField
                  value={form.account_number}
                  onChange={(e) =>
                    updateForm("account_number", e.target.value)
                  }
                />
              </div>
            </div>
          </FormSection>

          {/* ADDRESS */}
          <FormSection
            title="Bank Address"
            description="Optional address"
          >
            <div className="grid grid-cols-2 gap-3">
              <InputField
                placeholder="Country"
                value={form.country}
                onChange={(e) => updateForm("country", e.target.value)}
              />
              <InputField
                placeholder="City"
                value={form.city}
                onChange={(e) => updateForm("city", e.target.value)}
              />
              <InputField
                placeholder="Postal"
                value={form.postal_code}
                onChange={(e) => updateForm("postal_code", e.target.value)}
              />
              <InputField
                placeholder="Address 1"
                value={form.address_line_1}
                onChange={(e) =>
                  updateForm("address_line_1", e.target.value)
                }
              />
              <InputField
                placeholder="Address 2"
                value={form.address_line_2}
                onChange={(e) =>
                  updateForm("address_line_2", e.target.value)
                }
              />
            </div>
          </FormSection>

          {/* CONTROL */}
          <FormSection
            title="Identifier / Control"
            description="Identifier, default, and status"
          >
            <div className="space-y-3">
              <InputField
                placeholder="Identifier Type (swift / iban)"
                value={form.account_identifier_type}
                onChange={(e) =>
                  updateForm("account_identifier_type", e.target.value)
                }
              />

              <InputField
                placeholder={identifierLabel}
                value={form.account_identifier_value}
                onChange={(e) =>
                  updateForm("account_identifier_value", e.target.value)
                }
              />

              <InputField
                placeholder="Currency"
                value={form.currency_code}
                onChange={(e) =>
                  updateForm("currency_code", e.target.value)
                }
              />

              <InputField
                placeholder="Status"
                value={form.status}
                onChange={(e) =>
                  updateForm("status", e.target.value as any)
                }
              />

              <label className="text-white/70 flex gap-2 items-center">
                <input
                  type="checkbox"
                  checked={form.is_default}
                  onChange={(e) =>
                    updateForm("is_default", e.target.checked)
                  }
                />
                Default account
              </label>
            </div>
          </FormSection>

          {/* NOTES */}
          <FormSection
            title="Notes"
            description="Internal notes"
            fullWidth
          >
            <TextareaField
              value={form.notes}
              onChange={(e) => updateForm("notes", e.target.value)}
            />
          </FormSection>

        </form>

        {formError && (
          <div className="text-red-400">{formError}</div>
        )}
      </div>
    </div>
  );
}

