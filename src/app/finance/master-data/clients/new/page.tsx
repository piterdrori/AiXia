import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, RefreshCw, Save } from "lucide-react";

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
      className={`min-h-[96px] w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none placeholder:text-white/30 ${props.className ?? ""}`}
    />
  );
}

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
    <Card className="overflow-hidden rounded-[24px] border border-white/10 bg-[linear-gradient(135deg,rgba(255,255,255,0.06),rgba(255,255,255,0.03))] backdrop-blur-xl shadow-[0_20px_60px_rgba(0,0,0,0.24)]">
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

export default function FinanceMasterDataClientCreatePage() {
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

      const created = await createClient({
        legal_name: trimmedLegalName,
        contact_name: form.contact_name.trim() || null,
        company_related_personnel: form.company_related_personnel.trim() || null,
        status: form.status,
        company_email: form.company_email.trim() || null,
        personnel_email: form.personnel_email.trim() || null,
        company_phone: form.company_phone.trim() || null,
        personnel_phone: form.personnel_phone.trim() || null,
        country: form.country.trim() || null,
        address_line_1: form.address_line_1.trim() || null,
        address_line_2: form.address_line_2.trim() || null,
        shipping_address_line_1: form.shipping_address_line_1.trim() || null,
        shipping_address_line_2: form.shipping_address_line_2.trim() || null,
        notes: form.notes.trim() || null,
        metadata: {},
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
                Identity-only client form with legal, communication, address, shipping, and notes.
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
                type="button"
                variant="outline"
                onClick={handleReset}
                className="h-11 rounded-2xl border-cyan-400/20 bg-cyan-500/10 px-4 text-cyan-100 hover:bg-cyan-500/20"
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Reset
              </Button>
            </div>
          </div>
        </section>

                   <div className="flex min-h-0 flex-1 flex-col overflow-y-auto overflow-x-hidden pr-1 pb-2">
          <form className="flex min-h-0 flex-col gap-4" onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <FormSection
                title="Section 1 — Basic"
                description="Legal identity, contact, related personnel, and status."
              >
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  <div className="md:col-span-2">
                    <FieldLabel label="Legal Name" required />
                    <InputField
                      value={form.legal_name}
                      onChange={(event) => updateForm("legal_name", event.target.value)}
                      placeholder="Enter legal company name"
                    />
                  </div>

                  <div>
                    <FieldLabel label="Contact Name" />
                    <InputField
                      value={form.contact_name}
                      onChange={(event) => updateForm("contact_name", event.target.value)}
                      placeholder="Contact person name"
                    />
                  </div>

                  <div>
                    <FieldLabel label="Company Related Personnel" />
                    <InputField
                      value={form.company_related_personnel}
                      onChange={(event) =>
                        updateForm("company_related_personnel", event.target.value)
                      }
                      placeholder="Related personnel"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <FieldLabel label="Status" />
                    <SelectField
                      value={form.status}
                      onChange={(event) =>
                        updateForm("status", event.target.value as FormState["status"])
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
                title="Section 2 — Communication"
                description="Company and personnel communication details."
              >
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  <div>
                    <FieldLabel label="Company Email" />
                    <InputField
                      type="email"
                      value={form.company_email}
                      onChange={(event) => updateForm("company_email", event.target.value)}
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
                      onChange={(event) => updateForm("company_phone", event.target.value)}
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
                title="Section 3 — Address"
                description="Primary address details."
              >
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  <div className="md:col-span-2">
                    <FieldLabel label="Country" />
                    <InputField
                      value={form.country}
                      onChange={(event) => updateForm("country", event.target.value)}
                      placeholder="Country"
                    />
                  </div>

                  <div>
                    <FieldLabel label="Address Line 1" />
                    <InputField
                      value={form.address_line_1}
                      onChange={(event) =>
                        updateForm("address_line_1", event.target.value)
                      }
                      placeholder="Address line 1"
                    />
                  </div>

                  <div>
                    <FieldLabel label="Address Line 2" />
                    <InputField
                      value={form.address_line_2}
                      onChange={(event) =>
                        updateForm("address_line_2", event.target.value)
                      }
                      placeholder="Address line 2"
                    />
                  </div>
                </div>
              </FormSection>

              <FormSection
                title="Section 4 — Shipping"
                description="Shipping address details."
              >
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  <div>
                    <FieldLabel label="Shipping Address Line 1" />
                    <InputField
                      value={form.shipping_address_line_1}
                      onChange={(event) =>
                        updateForm("shipping_address_line_1", event.target.value)
                      }
                      placeholder="Shipping address line 1"
                    />
                  </div>

                  <div>
                    <FieldLabel label="Shipping Address Line 2" />
                    <InputField
                      value={form.shipping_address_line_2}
                      onChange={(event) =>
                        updateForm("shipping_address_line_2", event.target.value)
                      }
                      placeholder="Shipping address line 2"
                    />
                  </div>
                </div>
              </FormSection>
            </div>

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
              <FormSection
                title="Section 5 — Notes"
                description="Internal notes for this client record."
              >
                <div>
                  <FieldLabel label="Notes" />
                  <TextareaField
                    value={form.notes}
                    onChange={(event) => updateForm("notes", event.target.value)}
                    placeholder="Add notes"
                  />
                </div>
              </FormSection>

              <div className="flex flex-col gap-3 lg:min-w-[220px]">
                {formError ? (
                  <div className="rounded-2xl border border-rose-400/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
                    {formError}
                  </div>
                ) : null}

                <Button
                  type="submit"
                  variant="outline"
                  disabled={isSaving}
                  className="h-11 rounded-2xl border-emerald-400/20 bg-emerald-500/10 px-5 text-emerald-100 hover:bg-emerald-500/20"
                >
                  <Save className="mr-2 h-4 w-4" />
                  {isSaving ? "Saving..." : "Create Client"}
                </Button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
