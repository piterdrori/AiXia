import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, RefreshCw, Save } from "lucide-react";

import { createCompany } from "@/lib/finance/companies";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";

type FormState = {
  legal_name: string;
  display_name: string;
  contact_person: string;
  email: string;
  phone: string;
  status: "active" | "inactive" | "archived";
  company_code: string;
  registration_number: string;
  tax_number: string;
  website: string;
  currency_code: string;
  country: string;
  city: string;
  state_province: string;
  postal_code: string;
  address_line_1: string;
  address_line_2: string;
  notes: string;
};

const EMPTY_FORM: FormState = {
  legal_name: "",
  display_name: "",
  contact_person: "",
  email: "",
  phone: "",
  status: "active",
  company_code: "",
  registration_number: "",
  tax_number: "",
  website: "",
  currency_code: "",
  country: "",
  city: "",
  state_province: "",
  postal_code: "",
  address_line_1: "",
  address_line_2: "",
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
      className={`h-11 rounded-2xl border-white/10 bg-white/5 text-white placeholder:text-white/30 ${props.className ?? ""}`}
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

function TextareaField(
  props: React.TextareaHTMLAttributes<HTMLTextAreaElement>
) {
  return (
    <textarea
      {...props}
      className={`min-h-[110px] w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none placeholder:text-white/30 ${props.className ?? ""}`}
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

export default function FinanceMasterDataCompanyCreatePage() {
  const navigate = useNavigate();

  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  function updateForm<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({
      ...prev,
      [key]: value,
    }));
  }

  function handleReset() {
    setForm(EMPTY_FORM);
    setFormError(null);
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

      const created = await createCompany({
        legal_name: trimmedLegalName,
        name: form.display_name.trim() || null,
        contact_person: form.contact_person.trim() || null,
        status: form.status,
        email: form.email.trim() || null,
        phone: form.phone.trim() || null,
        company_code: form.company_code.trim() || null,
        registration_number: form.registration_number.trim() || null,
        tax_number: form.tax_number.trim() || null,
        website: form.website.trim() || null,
        currency_code: form.currency_code.trim() || null,
        country: form.country.trim() || null,
        city: form.city.trim() || null,
        state_province: form.state_province.trim() || null,
        postal_code: form.postal_code.trim() || null,
        address_line_1: form.address_line_1.trim() || null,
        address_line_2: form.address_line_2.trim() || null,
        notes: form.notes.trim() || null,
        metadata: {},
      });

      navigate(`/finance/master-data/companies/${created.id}`);
    } catch (error) {
      console.error("Failed to create finance company:", error);
      setFormError(
        error instanceof Error ? error.message : "Failed to create company."
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
                Create Company
              </h1>

              <div className="mt-2 text-sm text-white/50">
                Legal identity, registration, location, and internal finance
                ownership details.
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-3">
              <Button
                variant="outline"
                onClick={() => navigate("/finance/master-data/companies")}
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
                form="company-create-form"
                variant="outline"
                disabled={isSaving}
                className="h-11 rounded-2xl border-white/10 bg-white/5 px-4 text-white hover:bg-white/10"
              >
                <Save className="mr-2 h-4 w-4" />
                {isSaving ? "Saving..." : "Create Company"}
              </Button>
            </div>
          </div>
        </section>

                <div className="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto overflow-x-hidden pr-1 pb-2">
          <form
            id="company-create-form"
            className="flex min-h-0 flex-col gap-6"
            onSubmit={handleSubmit}
          >
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <FormSection
                title="Section 1 — Basic"
                description="Legal identity and primary communication details."
              >
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  <div className="md:col-span-2">
                    <FieldLabel label="Legal Name" required />
                    <InputField
                      value={form.legal_name}
                      onChange={(e) =>
                        updateForm("legal_name", e.target.value)
                      }
                      placeholder="Legal company name"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <FieldLabel label="Display Name" />
                    <InputField
                      value={form.display_name}
                      onChange={(e) =>
                        updateForm("display_name", e.target.value)
                      }
                      placeholder="Optional short display name"
                    />
                  </div>

                  <div>
                    <FieldLabel label="Contact Person" />
                    <InputField
                      value={form.contact_person}
                      onChange={(e) =>
                        updateForm("contact_person", e.target.value)
                      }
                      placeholder="Primary company contact"
                    />
                  </div>

                  <div>
                    <FieldLabel label="Status" />
                    <SelectField
                      value={form.status}
                      onChange={(e) =>
                        updateForm(
                          "status",
                          e.target.value as FormState["status"]
                        )
                      }
                    >
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                      <option value="archived">Archived</option>
                    </SelectField>
                  </div>

                  <div>
                    <FieldLabel label="Email" />
                    <InputField
                      value={form.email}
                      onChange={(e) => updateForm("email", e.target.value)}
                      placeholder="company@email.com"
                    />
                  </div>

                  <div>
                    <FieldLabel label="Phone" />
                    <InputField
                      value={form.phone}
                      onChange={(e) => updateForm("phone", e.target.value)}
                      placeholder="Company phone"
                    />
                  </div>

                  <div>
                    <FieldLabel label="Website" />
                    <InputField
                      value={form.website}
                      onChange={(e) => updateForm("website", e.target.value)}
                      placeholder="https://example.com"
                    />
                  </div>

                  <div>
                    <FieldLabel label="Currency Code" />
                    <InputField
                      value={form.currency_code}
                      onChange={(e) =>
                        updateForm("currency_code", e.target.value)
                      }
                      placeholder="USD"
                    />
                  </div>
                </div>
              </FormSection>

              <FormSection
                title="Section 2 — Company Identity"
                description="Internal company coding and legal registration fields."
              >
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  <div>
                    <FieldLabel label="Company Code" />
                    <InputField
                      value={form.company_code}
                      onChange={(e) =>
                        updateForm("company_code", e.target.value)
                      }
                      placeholder="AIXIA-US"
                    />
                  </div>

                  <div>
                    <FieldLabel label="Registration Number" />
                    <InputField
                      value={form.registration_number}
                      onChange={(e) =>
                        updateForm("registration_number", e.target.value)
                      }
                      placeholder="Registration number"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <FieldLabel label="Tax Number" />
                    <InputField
                      value={form.tax_number}
                      onChange={(e) =>
                        updateForm("tax_number", e.target.value)
                      }
                      placeholder="Tax number"
                    />
                  </div>
                </div>
              </FormSection>

              <FormSection
                title="Section 3 — Address"
                description="Primary company address and location details."
              >
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  <div>
                    <FieldLabel label="Country" />
                    <InputField
                      value={form.country}
                      onChange={(e) => updateForm("country", e.target.value)}
                      placeholder="Country"
                    />
                  </div>

                  <div>
                    <FieldLabel label="City" />
                    <InputField
                      value={form.city}
                      onChange={(e) => updateForm("city", e.target.value)}
                      placeholder="City"
                    />
                  </div>

                  <div>
                    <FieldLabel label="State / Province" />
                    <InputField
                      value={form.state_province}
                      onChange={(e) =>
                        updateForm("state_province", e.target.value)
                      }
                      placeholder="State or province"
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

                            <FormSection
                title="Section 4 — Notes"
                description="Internal notes for this company record."
                fullWidth
              >
                <TextareaField
                  value={form.notes}
                  onChange={(e) => updateForm("notes", e.target.value)}
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
