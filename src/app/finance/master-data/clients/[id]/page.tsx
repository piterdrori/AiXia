import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Building2,
  Pencil,
  RefreshCw,
  Save,
  ShieldCheck,
  X,
} from "lucide-react";

import { supabase } from "@/lib/supabase";
import { archiveClient, updateClient } from "@/lib/finance/clients";

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

type ClientDetailRecord = {
  id: string;
  code: string | null;
  name: string;
  legal_name: string | null;
  contact_person: string | null;
  status: "active" | "inactive" | "archived";
  company_related_personnel: string | null;
  company_email: string | null;
  personnel_email: string | null;
  company_phone: string | null;
  personnel_phone: string | null;
  country: string | null;
  address_line_1: string | null;
  address_line_2: string | null;
  shipping_address_line_1: string | null;
  shipping_address_line_2: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

type EditSection = null | "basic" | "communication" | "address" | "shipping" | "notes";

type BasicForm = {
  legal_name: string;
  contact_name: string;
  company_related_personnel: string;
  status: "active" | "inactive" | "archived";
};

type CommunicationForm = {
  company_email: string;
  personnel_email: string;
  company_phone: string;
  personnel_phone: string;
};

type AddressForm = {
  country: string;
  address_line_1: string;
  address_line_2: string;
};

type ShippingForm = {
  shipping_address_line_1: string;
  shipping_address_line_2: string;
};

function formatDateLabel(value: string | null) {
  if (!value) return "—";

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;

  return parsed.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function formatDateTimeLabel(value: string | null) {
  if (!value) return "—";

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;

  return parsed.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function getStatusTone(status: string) {
  switch (status) {
    case "active":
      return "border-emerald-400/15 bg-emerald-500/10 text-emerald-200";
    case "inactive":
      return "border-amber-400/15 bg-amber-500/10 text-amber-200";
    case "archived":
      return "border-rose-400/15 bg-rose-500/10 text-rose-200";
    default:
      return "border-white/10 bg-white/8 text-white/70";
  }
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
      className={`min-h-[140px] w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none placeholder:text-white/30 ${props.className ?? ""}`}
    />
  );
}

function DisplayRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-[18px] border border-white/8 bg-black/15 px-4 py-3">
      <div className="text-xs uppercase tracking-[0.18em] text-white/35">
        {label}
      </div>
      <div className="mt-2 break-words text-sm font-medium text-white">
        {value || "—"}
      </div>
    </div>
  );
}

function SectionCard({
  title,
  description,
  onEdit,
  children,
}: {
  title: string;
  description: string;
  onEdit?: () => void;
  children: React.ReactNode;
}) {
  return (
    <Card className="flex flex-col overflow-hidden rounded-[28px] border border-white/10 bg-white/[0.045] backdrop-blur-xl">
      <CardHeader className="border-b border-white/8 pb-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <CardTitle className="text-white">{title}</CardTitle>
            <CardDescription className="mt-1 text-white/45">
              {description}
            </CardDescription>
          </div>

          {onEdit ? (
            <Button
              variant="outline"
              onClick={onEdit}
              className="h-11 rounded-2xl border-cyan-400/20 bg-cyan-500/10 px-4 text-cyan-100 hover:bg-cyan-500/20"
            >
              <Pencil className="mr-2 h-4 w-4" />
              Edit
            </Button>
          ) : null}
        </div>
      </CardHeader>

      <CardContent className="p-5">{children}</CardContent>
    </Card>
  );
}

function ModalShell({
  title,
  description,
  onClose,
  onSave,
  isSaving,
  children,
}: {
  title: string;
  description: string;
  onClose: () => void;
  onSave: () => void;
  isSaving: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div className="flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-[32px] border border-white/10 bg-[linear-gradient(135deg,rgba(15,23,42,0.96),rgba(17,24,39,0.94))] shadow-[0_30px_120px_rgba(0,0,0,0.50)]">
        <div className="flex items-start justify-between gap-4 border-b border-white/10 px-6 py-5">
          <div>
            <div className="text-xl font-semibold text-white">{title}</div>
            <div className="mt-1 text-sm text-white/50">{description}</div>
          </div>

          <Button
            variant="outline"
            onClick={onClose}
            className="h-11 rounded-2xl border-white/10 bg-white/5 px-4 text-white hover:bg-white/10"
          >
            <X className="mr-2 h-4 w-4" />
            Close
          </Button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">{children}</div>

        <div className="flex items-center justify-end gap-3 border-t border-white/10 px-6 py-5">
          <Button
            variant="outline"
            onClick={onClose}
            className="h-11 rounded-2xl border-white/10 bg-white/5 px-4 text-white hover:bg-white/10"
          >
            Cancel
          </Button>

          <Button
            variant="outline"
            onClick={onSave}
            disabled={isSaving}
            className="h-11 rounded-2xl border-emerald-400/20 bg-emerald-500/10 px-4 text-emerald-100 hover:bg-emerald-500/20"
          >
            <Save className="mr-2 h-4 w-4" />
            {isSaving ? "Saving..." : "Save Section"}
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function FinanceMasterDataClientDetailPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();

  const [client, setClient] = useState<ClientDetailRecord | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isMutating, setIsMutating] = useState(false);
  const [editingSection, setEditingSection] = useState<EditSection>(null);
  const [basicForm, setBasicForm] = useState<BasicForm>({
    legal_name: "",
    contact_name: "",
    company_related_personnel: "",
    status: "active",
  });
  const [communicationForm, setCommunicationForm] = useState<CommunicationForm>({
    company_email: "",
    personnel_email: "",
    company_phone: "",
    personnel_phone: "",
  });
  const [addressForm, setAddressForm] = useState<AddressForm>({
    country: "",
    address_line_1: "",
    address_line_2: "",
  });
  const [shippingForm, setShippingForm] = useState<ShippingForm>({
    shipping_address_line_1: "",
    shipping_address_line_2: "",
  });
  const [notesForm, setNotesForm] = useState("");
  const [modalError, setModalError] = useState<string | null>(null);

  const loadClient = useCallback(async () => {
    if (!id) return;

    setIsLoading(true);

    try {
      const { data, error } = await supabase
        .from("finance_clients")
        .select(`
          id,
          code,
          name,
          legal_name,
          contact_person,
          status,
          company_related_personnel,
          company_email,
          personnel_email,
          company_phone,
          personnel_phone,
          country,
          address_line_1,
          address_line_2,
          shipping_address_line_1,
          shipping_address_line_2,
          notes,
          created_at,
          updated_at
        `)
        .eq("id", id)
        .single();

      if (error) throw error;

      setClient(data as ClientDetailRecord);
    } catch (error) {
      console.error("Failed to load finance client details:", error);
      setClient(null);
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void loadClient();
  }, [loadClient]);

  function openBasicEditor() {
    if (!client) return;

    setModalError(null);
    setBasicForm({
      legal_name: client.legal_name || client.name || "",
      contact_name: client.contact_person || "",
      company_related_personnel: client.company_related_personnel || "",
      status: client.status,
    });
    setEditingSection("basic");
  }

  function openCommunicationEditor() {
    if (!client) return;

    setModalError(null);
    setCommunicationForm({
      company_email: client.company_email || "",
      personnel_email: client.personnel_email || "",
      company_phone: client.company_phone || "",
      personnel_phone: client.personnel_phone || "",
    });
    setEditingSection("communication");
  }

  function openAddressEditor() {
    if (!client) return;

    setModalError(null);
    setAddressForm({
      country: client.country || "",
      address_line_1: client.address_line_1 || "",
      address_line_2: client.address_line_2 || "",
    });
    setEditingSection("address");
  }

  function openShippingEditor() {
    if (!client) return;

    setModalError(null);
    setShippingForm({
      shipping_address_line_1: client.shipping_address_line_1 || "",
      shipping_address_line_2: client.shipping_address_line_2 || "",
    });
    setEditingSection("shipping");
  }

  function openNotesEditor() {
    if (!client) return;

    setModalError(null);
    setNotesForm(client.notes || "");
    setEditingSection("notes");
  }

  async function saveBasicSection() {
    if (!client) return;

    const legalName = basicForm.legal_name.trim();
    if (!legalName) {
      setModalError("Legal name is required.");
      return;
    }

    try {
      setIsMutating(true);
      setModalError(null);

      await updateClient(client.id, {
        legal_name: legalName,
        contact_person: basicForm.contact_name.trim() || null,
        company_related_personnel:
          basicForm.company_related_personnel.trim() || null,
        status: basicForm.status,
      });

      setEditingSection(null);
      await loadClient();
    } catch (error) {
      console.error("Failed to save basic section:", error);
      setModalError(error instanceof Error ? error.message : "Failed to save.");
    } finally {
      setIsMutating(false);
    }
  }

  async function saveCommunicationSection() {
    if (!client) return;

    try {
      setIsMutating(true);
      setModalError(null);

      await updateClient(client.id, {
        company_email: communicationForm.company_email.trim() || null,
        personnel_email: communicationForm.personnel_email.trim() || null,
        company_phone: communicationForm.company_phone.trim() || null,
        personnel_phone: communicationForm.personnel_phone.trim() || null,
      });

      setEditingSection(null);
      await loadClient();
    } catch (error) {
      console.error("Failed to save communication section:", error);
      setModalError(error instanceof Error ? error.message : "Failed to save.");
    } finally {
      setIsMutating(false);
    }
  }

  async function saveAddressSection() {
    if (!client) return;

    try {
      setIsMutating(true);
      setModalError(null);

      await updateClient(client.id, {
        country: addressForm.country.trim() || null,
        address_line_1: addressForm.address_line_1.trim() || null,
        address_line_2: addressForm.address_line_2.trim() || null,
      });

      setEditingSection(null);
      await loadClient();
    } catch (error) {
      console.error("Failed to save address section:", error);
      setModalError(error instanceof Error ? error.message : "Failed to save.");
    } finally {
      setIsMutating(false);
    }
  }

  async function saveShippingSection() {
    if (!client) return;

    try {
      setIsMutating(true);
      setModalError(null);

      await updateClient(client.id, {
        shipping_address_line_1: shippingForm.shipping_address_line_1.trim() || null,
        shipping_address_line_2: shippingForm.shipping_address_line_2.trim() || null,
      });

      setEditingSection(null);
      await loadClient();
    } catch (error) {
      console.error("Failed to save shipping section:", error);
      setModalError(error instanceof Error ? error.message : "Failed to save.");
    } finally {
      setIsMutating(false);
    }
  }

  async function saveNotesSection() {
    if (!client) return;

    try {
      setIsMutating(true);
      setModalError(null);

      await updateClient(client.id, {
        notes: notesForm.trim() || null,
      });

      setEditingSection(null);
      await loadClient();
    } catch (error) {
      console.error("Failed to save notes section:", error);
      setModalError(error instanceof Error ? error.message : "Failed to save.");
    } finally {
      setIsMutating(false);
    }
  }

  async function handleArchiveToggle() {
    if (!client) return;

    try {
      setIsMutating(true);

      if (client.status === "archived") {
        await updateClient(client.id, { status: "active" });
      } else {
        await archiveClient(client.id);
      }

      await loadClient();
    } catch (error) {
      console.error("Failed to update client status:", error);
    } finally {
      setIsMutating(false);
    }
  }

  if (isLoading) {
    return (
      <div className="flex h-full min-h-0 flex-col overflow-hidden">
        <div className="mx-auto flex h-full w-full max-w-[1920px] min-h-0 flex-col gap-6 px-4 pb-4 pt-2 sm:px-6 xl:px-8">
          <div className="flex min-h-0 flex-1 items-center justify-center">
            <div className="text-sm text-white/50">Loading client details...</div>
          </div>
        </div>
      </div>
    );
  }

  if (!client) {
    return (
      <div className="flex h-full min-h-0 flex-col overflow-hidden">
        <div className="mx-auto flex h-full w-full max-w-[1920px] min-h-0 flex-col gap-6 px-4 pb-4 pt-2 sm:px-6 xl:px-8">
          <div className="flex min-h-0 flex-1 items-center justify-center">
            <Card className="w-full max-w-xl overflow-hidden rounded-[28px] border border-white/10 bg-white/[0.045] backdrop-blur-xl">
              <CardContent className="p-8 text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-black/20 text-white/70">
                  <Building2 className="h-6 w-6" />
                </div>
                <div className="mt-4 text-lg font-semibold text-white">
                  Client not found
                </div>
                <div className="mt-2 text-sm text-white/50">
                  The client record could not be loaded.
                </div>
                <div className="mt-6">
                  <Button
                    variant="outline"
                    onClick={() => navigate("/finance/master-data/clients")}
                    className="h-11 rounded-2xl border-white/10 bg-white/5 px-4 text-white hover:bg-white/10"
                  >
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back to Clients
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  const displayName = client.legal_name || client.name;

  return (
    <>
      <div className="flex h-full min-h-0 flex-col overflow-hidden">
        <div className="mx-auto flex h-full w-full max-w-[1920px] min-h-0 flex-col gap-6 px-4 pb-4 pt-2 sm:px-6 xl:px-8">
          <section className="relative z-10 flex-shrink-0 overflow-hidden rounded-[30px] border border-white/10 bg-[linear-gradient(135deg,rgba(34,211,238,0.08),rgba(139,92,246,0.08),rgba(255,255,255,0.03))] backdrop-blur-xl">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.18),transparent_28%),radial-gradient(circle_at_top_right,rgba(139,92,246,0.14),transparent_26%),radial-gradient(circle_at_bottom_left,rgba(16,185,129,0.14),transparent_24%)]" />

            <div className="relative flex items-center justify-between gap-4 px-5 py-5 sm:px-6 xl:px-7">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge className="rounded-full border border-cyan-400/20 bg-cyan-500/10 px-3 py-1 text-[11px] uppercase tracking-[0.22em] text-cyan-200 shadow-none">
                    Master Data
                  </Badge>
                  <Badge className="rounded-full border border-white/10 bg-white/8 px-3 py-1 text-[11px] text-white/70 shadow-none">
                    {client.code || "No code"}
                  </Badge>
                  <Badge
                    className={`rounded-full px-3 py-1 text-[11px] shadow-none ${getStatusTone(
                      client.status
                    )}`}
                  >
                    {client.status}
                  </Badge>
                </div>

                <h1 className="mt-3 text-2xl font-semibold tracking-tight text-white sm:text-3xl">
                  {displayName}
                </h1>

                <div className="mt-2 text-sm text-white/50">
                  Client record with in-page popup editing.
                </div>
              </div>

              <div className="flex shrink-0 flex-wrap items-center gap-3">
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
                  onClick={() => void handleArchiveToggle()}
                  disabled={isMutating}
                  className="h-11 rounded-2xl border-white/10 bg-white/5 px-4 text-white hover:bg-white/10"
                >
                  <ShieldCheck className="mr-2 h-4 w-4" />
                  {isMutating
                    ? "Updating..."
                    : client.status === "archived"
                    ? "Activate"
                    : "Archive"}
                </Button>

                <Button
                  variant="outline"
                  onClick={() => void loadClient()}
                  className="h-11 rounded-2xl border-white/10 bg-white/5 px-4 text-white hover:bg-white/10"
                >
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Refresh
                </Button>
              </div>
            </div>
          </section>

          <div className="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto overflow-x-hidden pr-1 pb-2">
            <section className="grid grid-cols-1 gap-6 xl:grid-cols-2">
              <SectionCard
                title="Section 1 — Basic"
                description="Legal identity, contact, related personnel, and status."
                onEdit={openBasicEditor}
              >
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  <DisplayRow label="Legal Name" value={displayName} />
                  <DisplayRow label="Contact Name" value={client.contact_person || "—"} />
                  <DisplayRow
                    label="Company Related Personnel"
                    value={client.company_related_personnel || "—"}
                  />
                  <DisplayRow label="Status" value={client.status || "—"} />
                </div>
              </SectionCard>

              <SectionCard
                title="System Fields"
                description="Read-only audit fields."
              >
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  <DisplayRow label="Code" value={client.code || "—"} />
                  <DisplayRow label="Created At" value={formatDateTimeLabel(client.created_at)} />
                </div>
              </SectionCard>
            </section>

            <SectionCard
              title="Section 2 — Communication"
              description="Company and personnel communication details."
              onEdit={openCommunicationEditor}
            >
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
                <DisplayRow label="Company Email" value={client.company_email || "—"} />
                <DisplayRow label="Personnel Email" value={client.personnel_email || "—"} />
                <DisplayRow label="Company Phone" value={client.company_phone || "—"} />
                <DisplayRow label="Personnel Phone" value={client.personnel_phone || "—"} />
              </div>
            </SectionCard>

            <section className="grid grid-cols-1 gap-6 xl:grid-cols-2">
              <SectionCard
                title="Section 3 — Address"
                description="Primary address details."
                onEdit={openAddressEditor}
              >
                <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                  <DisplayRow label="Country" value={client.country || "—"} />
                  <DisplayRow label="Address Line 1" value={client.address_line_1 || "—"} />
                  <DisplayRow label="Address Line 2" value={client.address_line_2 || "—"} />
                </div>
              </SectionCard>

              <SectionCard
                title="Section 4 — Shipping"
                description="Shipping address details."
                onEdit={openShippingEditor}
              >
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  <DisplayRow
                    label="Shipping Address Line 1"
                    value={client.shipping_address_line_1 || "—"}
                  />
                  <DisplayRow
                    label="Shipping Address Line 2"
                    value={client.shipping_address_line_2 || "—"}
                  />
                </div>
              </SectionCard>
            </section>

            <SectionCard
              title="Section 5 — Notes"
              description="Internal notes for this client record."
              onEdit={openNotesEditor}
            >
              <div className="rounded-[20px] border border-white/8 bg-black/15 px-4 py-4 text-sm leading-7 text-white/70">
                {client.notes || "No notes added yet."}
              </div>
            </SectionCard>
          </div>
        </div>
      </div>

      {editingSection === "basic" ? (
        <ModalShell
          title="Edit Section 1 — Basic"
          description="Update legal identity, contact, related personnel, and status."
          onClose={() => setEditingSection(null)}
          onSave={() => void saveBasicSection()}
          isSaving={isMutating}
        >
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="md:col-span-2">
              <FieldLabel label="Legal Name" required />
              <InputField
                value={basicForm.legal_name}
                onChange={(event) =>
                  setBasicForm((prev) => ({ ...prev, legal_name: event.target.value }))
                }
              />
            </div>

            <div>
              <FieldLabel label="Contact Name" />
              <InputField
                value={basicForm.contact_name}
                onChange={(event) =>
                  setBasicForm((prev) => ({ ...prev, contact_name: event.target.value }))
                }
              />
            </div>

            <div>
              <FieldLabel label="Company Related Personnel" />
              <InputField
                value={basicForm.company_related_personnel}
                onChange={(event) =>
                  setBasicForm((prev) => ({
                    ...prev,
                    company_related_personnel: event.target.value,
                  }))
                }
              />
            </div>

            <div>
              <FieldLabel label="Status" />
              <SelectField
                value={basicForm.status}
                onChange={(event) =>
                  setBasicForm((prev) => ({
                    ...prev,
                    status: event.target.value as BasicForm["status"],
                  }))
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

          {modalError ? <div className="mt-4 text-sm text-rose-300">{modalError}</div> : null}
        </ModalShell>
      ) : null}

      {editingSection === "communication" ? (
        <ModalShell
          title="Edit Section 2 — Communication"
          description="Update company and personnel communication details."
          onClose={() => setEditingSection(null)}
          onSave={() => void saveCommunicationSection()}
          isSaving={isMutating}
        >
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <FieldLabel label="Company Email" />
              <InputField
                value={communicationForm.company_email}
                onChange={(event) =>
                  setCommunicationForm((prev) => ({
                    ...prev,
                    company_email: event.target.value,
                  }))
                }
              />
            </div>

            <div>
              <FieldLabel label="Personnel Email" />
              <InputField
                value={communicationForm.personnel_email}
                onChange={(event) =>
                  setCommunicationForm((prev) => ({
                    ...prev,
                    personnel_email: event.target.value,
                  }))
                }
              />
            </div>

            <div>
              <FieldLabel label="Company Phone" />
              <InputField
                value={communicationForm.company_phone}
                onChange={(event) =>
                  setCommunicationForm((prev) => ({
                    ...prev,
                    company_phone: event.target.value,
                  }))
                }
              />
            </div>

            <div>
              <FieldLabel label="Personnel Phone" />
              <InputField
                value={communicationForm.personnel_phone}
                onChange={(event) =>
                  setCommunicationForm((prev) => ({
                    ...prev,
                    personnel_phone: event.target.value,
                  }))
                }
              />
            </div>
          </div>

          {modalError ? <div className="mt-4 text-sm text-rose-300">{modalError}</div> : null}
        </ModalShell>
      ) : null}

      {editingSection === "address" ? (
        <ModalShell
          title="Edit Section 3 — Address"
          description="Update country and primary address fields."
          onClose={() => setEditingSection(null)}
          onSave={() => void saveAddressSection()}
          isSaving={isMutating}
        >
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div>
              <FieldLabel label="Country" />
              <InputField
                value={addressForm.country}
                onChange={(event) =>
                  setAddressForm((prev) => ({ ...prev, country: event.target.value }))
                }
              />
            </div>

            <div>
              <FieldLabel label="Address Line 1" />
              <InputField
                value={addressForm.address_line_1}
                onChange={(event) =>
                  setAddressForm((prev) => ({
                    ...prev,
                    address_line_1: event.target.value,
                  }))
                }
              />
            </div>

            <div>
              <FieldLabel label="Address Line 2" />
              <InputField
                value={addressForm.address_line_2}
                onChange={(event) =>
                  setAddressForm((prev) => ({
                    ...prev,
                    address_line_2: event.target.value,
                  }))
                }
              />
            </div>
          </div>

          {modalError ? <div className="mt-4 text-sm text-rose-300">{modalError}</div> : null}
        </ModalShell>
      ) : null}

      {editingSection === "shipping" ? (
        <ModalShell
          title="Edit Section 4 — Shipping"
          description="Update shipping address fields."
          onClose={() => setEditingSection(null)}
          onSave={() => void saveShippingSection()}
          isSaving={isMutating}
        >
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <FieldLabel label="Shipping Address Line 1" />
              <InputField
                value={shippingForm.shipping_address_line_1}
                onChange={(event) =>
                  setShippingForm((prev) => ({
                    ...prev,
                    shipping_address_line_1: event.target.value,
                  }))
                }
              />
            </div>

            <div>
              <FieldLabel label="Shipping Address Line 2" />
              <InputField
                value={shippingForm.shipping_address_line_2}
                onChange={(event) =>
                  setShippingForm((prev) => ({
                    ...prev,
                    shipping_address_line_2: event.target.value,
                  }))
                }
              />
            </div>
          </div>

          {modalError ? <div className="mt-4 text-sm text-rose-300">{modalError}</div> : null}
        </ModalShell>
      ) : null}

      {editingSection === "notes" ? (
        <ModalShell
          title="Edit Section 5 — Notes"
          description="Update internal notes."
          onClose={() => setEditingSection(null)}
          onSave={() => void saveNotesSection()}
          isSaving={isMutating}
        >
          <div>
            <FieldLabel label="Notes" />
            <TextareaField
              value={notesForm}
              onChange={(event) => setNotesForm(event.target.value)}
              placeholder="Add internal notes"
            />
          </div>

          {modalError ? <div className="mt-4 text-sm text-rose-300">{modalError}</div> : null}
        </ModalShell>
      ) : null}
    </>
  );
}
