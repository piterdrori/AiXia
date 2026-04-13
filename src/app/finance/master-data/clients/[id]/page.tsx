import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Building2,
  Mail,
  MapPin,
  Pencil,
  Plus,
  RefreshCw,
  Save,
  ShieldCheck,
  Trash2,
  Truck,
  UserRound,
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


type EmployeeOption = {
  id: string;
  label: string;
  email: string;
};

type ClientPersonnelRow = {
  id?: string;
  employee_user_id?: string;
  employee_label?: string;
  name?: string;
  role?: string;
  email?: string;
  phone?: string;
};

type ClientCommunicationRow = {
  id?: string;
  label?: string;
  type?: "company" | "personnel" | "other" | string;
  email?: string;
  phone?: string;
};

type ClientAddressRow = {
  id?: string;
  label?: string;
  country?: string;
  line1?: string;
  line2?: string;
};

type ClientMetadata = {
  personnel?: ClientPersonnelRow[];
  communications?: ClientCommunicationRow[];
  addresses?: ClientAddressRow[];
  shipping_addresses?: ClientAddressRow[];
};

type ClientDetailRecord = {
  id: string;
  code: string | null;
  name: string;
  legal_name: string | null;
  status: string;
  company_email: string | null;
  personnel_email: string | null;
  company_phone: string | null;
  personnel_phone: string | null;
  company_related_personnel: string | null;
  country: string | null;
  address_line_1: string | null;
  address_line_2: string | null;
  shipping_address_line_1: string | null;
  shipping_address_line_2: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  metadata: ClientMetadata | null;
};

type EditSection =
  | null
  | "core"
  | "personnel"
  | "communication"
  | "addresses"
  | "shipping"
  | "notes";

type CoreForm = {
  legal_name: string;
  status: "active" | "inactive" | "archived";
  company_related_personnel: string;
  company_email: string;
  personnel_email: string;
  company_phone: string;
  personnel_phone: string;
  country: string;
};

type RawProfileRow = Record<string, unknown>;

function uid(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

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

function emptyPersonnelRow(): ClientPersonnelRow {
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

function emptyCommunicationRow(): ClientCommunicationRow {
  return {
    id: uid("communication"),
    label: "",
    type: "other",
    email: "",
    phone: "",
  };
}

function emptyAddressRow(prefix: string): ClientAddressRow {
  return {
    id: uid(prefix),
    label: "",
    country: "",
    line1: "",
    line2: "",
  };
}

function cleanPersonnelRows(rows: ClientPersonnelRow[]) {
  return rows.filter(
    (row) =>
      Boolean(row.name?.trim()) ||
      Boolean(row.employee_label?.trim()) ||
      Boolean(row.employee_user_id?.trim()) ||
      Boolean(row.role?.trim()) ||
      Boolean(row.email?.trim()) ||
      Boolean(row.phone?.trim())
  );
}

function cleanCommunicationRows(rows: ClientCommunicationRow[]) {
  return rows.filter(
    (row) =>
      Boolean(row.label?.trim()) ||
      Boolean(row.type?.trim()) ||
      Boolean(row.email?.trim()) ||
      Boolean(row.phone?.trim())
  );
}

function cleanAddressRows(rows: ClientAddressRow[]) {
  return rows.filter(
    (row) =>
      Boolean(row.label?.trim()) ||
      Boolean(row.country?.trim()) ||
      Boolean(row.line1?.trim()) ||
      Boolean(row.line2?.trim())
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

function SectionCard({
  title,
  description,
  accentClass,
  onEdit,
  children,
}: {
  title: string;
  description: string;
  accentClass: string;
  onEdit?: () => void;
  children: React.ReactNode;
}) {
  return (
    <Card className="flex flex-col overflow-hidden rounded-[28px] border border-white/10 bg-white/[0.045] backdrop-blur-xl">
      <CardHeader className="border-b border-white/8 pb-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <div
              className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-white/10 shadow-[0_0_30px_rgba(255,255,255,0.08)] ${accentClass}`}
            >
              <div className="h-2.5 w-2.5 rounded-full bg-white/80" />
            </div>
            <div>
              <CardTitle className="text-white">{title}</CardTitle>
              <CardDescription className="mt-1 text-white/45">
                {description}
              </CardDescription>
            </div>
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
      <CardContent className="flex min-h-0 flex-col p-5">{children}</CardContent>
    </Card>
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
      <div className="flex max-h-[90vh] w-full max-w-5xl flex-col overflow-hidden rounded-[32px] border border-white/10 bg-[linear-gradient(135deg,rgba(15,23,42,0.96),rgba(17,24,39,0.94))] shadow-[0_30px_120px_rgba(0,0,0,0.50)]">
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
  const [employees, setEmployees] = useState<EmployeeOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isMutating, setIsMutating] = useState(false);

  const [editingSection, setEditingSection] = useState<EditSection>(null);
  const [coreForm, setCoreForm] = useState<CoreForm>({
    legal_name: "",
    status: "active",
    company_related_personnel: "",
    company_email: "",
    personnel_email: "",
    company_phone: "",
    personnel_phone: "",
    country: "",
  });
  const [personnelForm, setPersonnelForm] = useState<ClientPersonnelRow[]>([]);
  const [communicationForm, setCommunicationForm] = useState<
    ClientCommunicationRow[]
  >([]);
  const [addressesForm, setAddressesForm] = useState<ClientAddressRow[]>([]);
  const [shippingForm, setShippingForm] = useState<ClientAddressRow[]>([]);
  const [notesForm, setNotesForm] = useState("");
  const [modalError, setModalError] = useState<string | null>(null);

  const loadClient = useCallback(async () => {
    if (!id) return;

    setIsLoading(true);

    try {
      const [clientResult, employeesResult] = await Promise.all([
        supabase
          .from("finance_clients")
          .select(
            `
              id,
              code,
              name,
              legal_name,
              status,
              company_email,
              personnel_email,
              company_phone,
              personnel_phone,
              company_related_personnel,
              country,
              address_line_1,
              address_line_2,
              shipping_address_line_1,
              shipping_address_line_2,
              notes,
              created_at,
              updated_at,
              metadata
            `
          )
          .eq("id", id)
          .single(),

        supabase.from("profiles").select("*").order("created_at", {
          ascending: false,
        }),
      ]);

           if (clientResult.error) throw clientResult.error;

      setClient(clientResult.data as ClientDetailRecord);

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
      setEmployees(nextEmployees);
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

  const metadata = useMemo<ClientMetadata>(() => client?.metadata ?? {}, [client]);

  const personnel = useMemo<ClientPersonnelRow[]>(() => {
    const rows = cleanPersonnelRows(metadata.personnel ?? []);
    if (rows.length > 0) return rows;

    if (!client) return [];

    return [
      {
        name: client.company_related_personnel ?? "",
        role: "",
        email: client.personnel_email ?? "",
        phone: client.personnel_phone ?? "",
      },
    ].filter(
      (row) =>
        Boolean(row.name?.trim()) ||
        Boolean(row.email?.trim()) ||
        Boolean(row.phone?.trim())
    );
  }, [client, metadata.personnel]);

  const communications = useMemo<ClientCommunicationRow[]>(() => {
    const rows = cleanCommunicationRows(metadata.communications ?? []);
    if (rows.length > 0) return rows;

    if (!client) return [];

    return [
      {
        label: "Company",
        type: "company",
        email: client.company_email ?? "",
        phone: client.company_phone ?? "",
      },
      {
        label: "Personnel",
        type: "personnel",
        email: client.personnel_email ?? "",
        phone: client.personnel_phone ?? "",
      },
    ].filter(
      (row) => Boolean(row.email?.trim()) || Boolean(row.phone?.trim())
    );
  }, [client, metadata.communications]);

  const addresses = useMemo<ClientAddressRow[]>(() => {
    const rows = cleanAddressRows(metadata.addresses ?? []);
    if (rows.length > 0) return rows;

    if (!client) return [];

    return [
      {
        label: "Primary",
        country: client.country ?? "",
        line1: client.address_line_1 ?? "",
        line2: client.address_line_2 ?? "",
      },
    ].filter(
      (row) =>
        Boolean(row.country?.trim()) ||
        Boolean(row.line1?.trim()) ||
        Boolean(row.line2?.trim())
    );
  }, [client, metadata.addresses]);

  const shippingAddresses = useMemo<ClientAddressRow[]>(() => {
    const rows = cleanAddressRows(metadata.shipping_addresses ?? []);
    if (rows.length > 0) return rows;

    if (!client) return [];

    return [
      {
        label: "Shipping",
        country: client.country ?? "",
        line1: client.shipping_address_line_1 ?? "",
        line2: client.shipping_address_line_2 ?? "",
      },
    ].filter(
      (row) =>
        Boolean(row.country?.trim()) ||
        Boolean(row.line1?.trim()) ||
        Boolean(row.line2?.trim())
    );
  }, [client, metadata.shipping_addresses]);

  function openCoreEditor() {
    if (!client) return;
    setModalError(null);
    setCoreForm({
      legal_name: client.legal_name || client.name || "",
      status: (client.status as CoreForm["status"]) || "active",
      company_related_personnel: client.company_related_personnel || "",
      company_email: client.company_email || "",
      personnel_email: client.personnel_email || "",
      company_phone: client.company_phone || "",
      personnel_phone: client.personnel_phone || "",
      country: client.country || "",
    });
    setEditingSection("core");
  }

  function openPersonnelEditor() {
    setModalError(null);
    setPersonnelForm(
      personnel.length > 0
        ? personnel.map((row) => ({
            ...row,
            id: row.id || uid("personnel"),
          }))
        : [emptyPersonnelRow()]
    );
    setEditingSection("personnel");
  }

  function openCommunicationEditor() {
    setModalError(null);
    setCommunicationForm(
      communications.length > 0
        ? communications.map((row) => ({
            ...row,
            id: row.id || uid("communication"),
          }))
        : [emptyCommunicationRow()]
    );
    setEditingSection("communication");
  }

  function openAddressesEditor() {
    setModalError(null);
    setAddressesForm(
      addresses.length > 0
        ? addresses.map((row) => ({
            ...row,
            id: row.id || uid("address"),
          }))
        : [emptyAddressRow("address")]
    );
    setEditingSection("addresses");
  }

  function openShippingEditor() {
    setModalError(null);
    setShippingForm(
      shippingAddresses.length > 0
        ? shippingAddresses.map((row) => ({
            ...row,
            id: row.id || uid("shipping"),
          }))
        : [emptyAddressRow("shipping")]
    );
    setEditingSection("shipping");
  }

    function openNotesEditor() {
    if (!client) return;
    setModalError(null);
    setNotesForm(client.notes || "");
    setEditingSection("notes");
  }

  
    async function saveCoreSection() {
    if (!client) return;

    const legalName = coreForm.legal_name.trim();
    if (!legalName) {
      setModalError("Legal name is required.");
      return;
    }

    try {
      setIsMutating(true);
      setModalError(null);

      await updateClient(client.id, {
        legal_name: legalName,
        status: coreForm.status,
        company_related_personnel:
          coreForm.company_related_personnel.trim() || null,
        company_email: coreForm.company_email.trim() || null,
        personnel_email: coreForm.personnel_email.trim() || null,
        company_phone: coreForm.company_phone.trim() || null,
        personnel_phone: coreForm.personnel_phone.trim() || null,
        country: coreForm.country.trim() || null,
      });

      setEditingSection(null);
      await loadClient();
    } catch (error) {
      console.error("Failed to save core section:", error);
      setModalError(error instanceof Error ? error.message : "Failed to save.");
    } finally {
      setIsMutating(false);
    }
  }
  
  async function savePersonnelSection() {
    if (!client) return;

    const cleaned = cleanPersonnelRows(personnelForm);

    try {
      setIsMutating(true);
      setModalError(null);

      const primary =
        cleaned.find(
          (row) =>
            Boolean(row.name?.trim()) ||
            Boolean(row.employee_label?.trim()) ||
            Boolean(row.email?.trim())
        ) || null;

      await updateClient(client.id, {
        company_related_personnel:
          primary?.role?.trim() ||
          primary?.name?.trim() ||
          primary?.employee_label?.trim() ||
          null,
        personnel_email: primary?.email?.trim() || null,
        personnel_phone: primary?.phone?.trim() || null,
        metadata: {
          ...metadata,
          personnel: cleaned,
        },
      });

      setEditingSection(null);
      await loadClient();
    } catch (error) {
      console.error("Failed to save personnel section:", error);
      setModalError(error instanceof Error ? error.message : "Failed to save.");
    } finally {
      setIsMutating(false);
    }
  }

  async function saveCommunicationSection() {
    if (!client) return;

    const cleaned = cleanCommunicationRows(communicationForm);

    try {
      setIsMutating(true);
      setModalError(null);

      const company =
        cleaned.find((row) => row.type === "company") || cleaned[0] || null;
      const person = cleaned.find((row) => row.type === "personnel") || null;

      await updateClient(client.id, {
        company_email: company?.email?.trim() || null,
        company_phone: company?.phone?.trim() || null,
        personnel_email: person?.email?.trim() || client.personnel_email || null,
        personnel_phone: person?.phone?.trim() || client.personnel_phone || null,
        metadata: {
          ...metadata,
          communications: cleaned,
        },
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

  async function saveAddressesSection() {
    if (!client) return;

    const cleaned = cleanAddressRows(addressesForm);
    const primary = cleaned[0] || null;

    try {
      setIsMutating(true);
      setModalError(null);
      await updateClient(client.id, {
        country: primary?.country?.trim() || null,
        address_line_1: primary?.line1?.trim() || null,
        address_line_2: primary?.line2?.trim() || null,
        metadata: {
          ...metadata,
          addresses: cleaned,
        },
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

    const cleaned = cleanAddressRows(shippingForm);
    const primary = cleaned[0] || null;

    try {
      setIsMutating(true);
      setModalError(null);
      await updateClient(client.id, {
        shipping_address_line_1: primary?.line1?.trim() || null,
        shipping_address_line_2: primary?.line2?.trim() || null,
        metadata: {
          ...metadata,
          shipping_addresses: cleaned,
        },
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
                  Read-only finance client profile with section-by-section popup
                  editing.
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
            <div className="flex flex-col gap-6">
                
              <section className="grid grid-cols-1 gap-6 xl:grid-cols-2">
              <SectionCard
                title="Core Client Data"
                description="Main identity and finance-facing profile fields."
                accentClass="bg-[linear-gradient(135deg,rgba(34,211,238,0.18),rgba(59,130,246,0.10))]"
                onEdit={openCoreEditor}
              >
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  <DisplayRow label="Client Code" value={client.code || "—"} />
                  <DisplayRow label="Status" value={client.status || "—"} />
                  <DisplayRow label="Legal Name" value={displayName} />
                  <DisplayRow
                    label="Related Personnel"
                    value={client.company_related_personnel || "—"}
                  />
                  <DisplayRow
                    label="Company Email"
                    value={client.company_email || "—"}
                  />
                  <DisplayRow
                    label="Personnel Email"
                    value={client.personnel_email || "—"}
                  />
                  <DisplayRow
                    label="Company Phone"
                    value={client.company_phone || "—"}
                  />
                  <DisplayRow
                    label="Personnel Phone"
                    value={client.personnel_phone || "—"}
                  />
                  <DisplayRow label="Country" value={client.country || "—"} />
                  <DisplayRow label="Notes" value={client.notes || "—"} />
                </div>
              </SectionCard>

            <SectionCard
              title="Personnel"
              description="All linked or manually entered personnel records."
              accentClass="bg-[linear-gradient(135deg,rgba(99,102,241,0.18),rgba(139,92,246,0.10))]"
              onEdit={openPersonnelEditor}
            >
              {personnel.length === 0 ? (
                <div className="text-sm text-white/50">No personnel records found.</div>
              ) : (
                <div className="flex min-h-0 flex-col gap-4">
                  {personnel.map((person, index) => (
                    <div
                      key={person.id || `${person.name || "person"}-${index}`}
                      className="rounded-[24px] border border-white/10 bg-[linear-gradient(135deg,rgba(99,102,241,0.08),rgba(255,255,255,0.03))] p-4"
                    >
                      <div className="mb-4 flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-black/20 text-white/75">
                          <UserRound className="h-4 w-4" />
                        </div>
                        <div>
                          <div className="text-base font-semibold text-white">
                            {person.name ||
                              person.employee_label ||
                              "Unnamed personnel"}
                          </div>
                          <div className="text-sm text-white/50">
                            {person.role || "No role set"}
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
                        <DisplayRow
                          label="Employee Link"
                          value={
                            person.employee_label ||
                            person.employee_user_id ||
                            "—"
                          }
                        />
                        <DisplayRow label="Name" value={person.name || "—"} />
                        <DisplayRow label="Role" value={person.role || "—"} />
                        <DisplayRow label="Email" value={person.email || "—"} />
                        <DisplayRow label="Phone" value={person.phone || "—"} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </SectionCard>

            <SectionCard
              title="Communication"
              description="Company, personnel, and additional communication channels."
              accentClass="bg-[linear-gradient(135deg,rgba(34,211,238,0.18),rgba(16,185,129,0.10))]"
              onEdit={openCommunicationEditor}
            >
              {communications.length === 0 ? (
                <div className="text-sm text-white/50">
                  No communication records found.
                </div>
              ) : (
                <div className="flex min-h-0 flex-col gap-4">
                  {communications.map((item, index) => (
                    <div
                      key={item.id || `${item.label || "communication"}-${index}`}
                      className="rounded-[24px] border border-white/10 bg-[linear-gradient(135deg,rgba(34,211,238,0.08),rgba(255,255,255,0.03))] p-4"
                    >
                      <div className="mb-4 flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-black/20 text-white/75">
                          <Mail className="h-4 w-4" />
                        </div>
                        <div>
                          <div className="text-base font-semibold text-white">
                            {item.label || `Communication ${index + 1}`}
                          </div>
                          <div className="text-sm text-white/50">
                            {item.type || "other"}
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
                        <DisplayRow label="Label" value={item.label || "—"} />
                        <DisplayRow label="Type" value={item.type || "—"} />
                        <DisplayRow label="Email" value={item.email || "—"} />
                        <DisplayRow label="Phone" value={item.phone || "—"} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </SectionCard>

           </section>

             <section className="grid grid-cols-1 gap-6 xl:grid-cols-2">
              <SectionCard
                title="Main Address"
                description="Primary billing and registered addresses."
                accentClass="bg-[linear-gradient(135deg,rgba(16,185,129,0.18),rgba(34,211,238,0.10))]"
                onEdit={openAddressesEditor}
              >
                {addresses.length === 0 ? (
                  <div className="text-sm text-white/50">
                    No address records found.
                  </div>
                ) : (
                  <div className="space-y-4">
                    {addresses.map((address, index) => (
                      <div
                        key={address.id || `${address.label || "address"}-${index}`}
                        className="rounded-[24px] border border-white/10 bg-[linear-gradient(135deg,rgba(16,185,129,0.08),rgba(255,255,255,0.03))] p-4"
                      >
                        <div className="mb-4 flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-black/20 text-white/75">
                            <MapPin className="h-4 w-4" />
                          </div>
                          <div>
                            <div className="text-base font-semibold text-white">
                              {address.label || `Address ${index + 1}`}
                            </div>
                            <div className="text-sm text-white/50">
                              {address.country || "No country set"}
                            </div>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                          <DisplayRow label="Label" value={address.label || "—"} />
                          <DisplayRow
                            label="Country"
                            value={address.country || "—"}
                          />
                          <DisplayRow
                            label="Address Line 1"
                            value={address.line1 || "—"}
                          />
                          <DisplayRow
                            label="Address Line 2"
                            value={address.line2 || "—"}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </SectionCard>

              <SectionCard
                title="Shipping Address"
                description="Shipping and delivery addresses."
                accentClass="bg-[linear-gradient(135deg,rgba(245,158,11,0.18),rgba(244,63,94,0.10))]"
                onEdit={openShippingEditor}
              >
                {shippingAddresses.length === 0 ? (
                  <div className="text-sm text-white/50">
                    No shipping address records found.
                  </div>
                ) : (
                  <div className="space-y-4">
                    {shippingAddresses.map((address, index) => (
                      <div
                        key={address.id || `${address.label || "shipping"}-${index}`}
                        className="rounded-[24px] border border-white/10 bg-[linear-gradient(135deg,rgba(245,158,11,0.08),rgba(255,255,255,0.03))] p-4"
                      >
                        <div className="mb-4 flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-black/20 text-white/75">
                            <Truck className="h-4 w-4" />
                          </div>
                          <div>
                            <div className="text-base font-semibold text-white">
                              {address.label || `Shipping ${index + 1}`}
                            </div>
                            <div className="text-sm text-white/50">
                              {address.country || "No country set"}
                            </div>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                          <DisplayRow label="Label" value={address.label || "—"} />
                          <DisplayRow
                            label="Country"
                            value={address.country || "—"}
                          />
                          <DisplayRow
                            label="Address Line 1"
                            value={address.line1 || "—"}
                          />
                          <DisplayRow
                            label="Address Line 2"
                            value={address.line2 || "—"}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </SectionCard>
            </section>

            <SectionCard
              title="Notes"
              description="Internal notes and finance-side references."
              accentClass="bg-[linear-gradient(135deg,rgba(99,102,241,0.18),rgba(34,211,238,0.10))]"
              onEdit={openNotesEditor}
            >
              <div className="rounded-[20px] border border-white/8 bg-black/15 px-4 py-4 text-sm leading-7 text-white/70">
                {client.notes || "No notes added yet."}
              </div>
            </SectionCard>
          </div>
        </div>
      </div>
    </div>

      {editingSection === "core" ? (
        <ModalShell
          title="Edit Core Client Data"
          description="Update main identity and primary direct fields."
          onClose={() => setEditingSection(null)}
          onSave={() => void saveCoreSection()}
          isSaving={isMutating}
        >
          <div className="space-y-5">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              <div className="xl:col-span-2">
                <FieldLabel label="Legal Name" required />
                <InputField
                  value={coreForm.legal_name}
                  onChange={(event) =>
                    setCoreForm((prev) => ({
                      ...prev,
                      legal_name: event.target.value,
                    }))
                  }
                />
              </div>

              <div>
                <FieldLabel label="Status" />
                <SelectField
                  value={coreForm.status}
                  onChange={(event) =>
                    setCoreForm((prev) => ({
                      ...prev,
                      status: event.target.value as CoreForm["status"],
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

              <div>
                <FieldLabel label="Related Personnel" />
                <InputField
                  value={coreForm.company_related_personnel}
                  onChange={(event) =>
                    setCoreForm((prev) => ({
                      ...prev,
                      company_related_personnel: event.target.value,
                    }))
                  }
                />
              </div>

              <div>
                <FieldLabel label="Company Email" />
                <InputField
                  value={coreForm.company_email}
                  onChange={(event) =>
                    setCoreForm((prev) => ({
                      ...prev,
                      company_email: event.target.value,
                    }))
                  }
                />
              </div>

              <div>
                <FieldLabel label="Personnel Email" />
                <InputField
                  value={coreForm.personnel_email}
                  onChange={(event) =>
                    setCoreForm((prev) => ({
                      ...prev,
                      personnel_email: event.target.value,
                    }))
                  }
                />
              </div>

              <div>
                <FieldLabel label="Company Phone" />
                <InputField
                  value={coreForm.company_phone}
                  onChange={(event) =>
                    setCoreForm((prev) => ({
                      ...prev,
                      company_phone: event.target.value,
                    }))
                  }
                />
              </div>

              <div>
                <FieldLabel label="Personnel Phone" />
                <InputField
                  value={coreForm.personnel_phone}
                  onChange={(event) =>
                    setCoreForm((prev) => ({
                      ...prev,
                      personnel_phone: event.target.value,
                    }))
                  }
                />
              </div>

              <div>
                <FieldLabel label="Country" />
                <InputField
                  value={coreForm.country}
                  onChange={(event) =>
                    setCoreForm((prev) => ({
                      ...prev,
                      country: event.target.value,
                    }))
                  }
                />
              </div>
            </div>

            {modalError ? (
              <div className="text-sm text-rose-300">{modalError}</div>
            ) : null}
          </div>
        </ModalShell>
      ) : null}

      {editingSection === "personnel" ? (
        <ModalShell
          title="Edit Personnel"
          description="Add, remove, and update linked personnel."
          onClose={() => setEditingSection(null)}
          onSave={() => void savePersonnelSection()}
          isSaving={isMutating}
        >
          <div className="space-y-4">
            <div className="flex justify-end">
              <Button
                variant="outline"
                onClick={() =>
                  setPersonnelForm((prev) => [...prev, emptyPersonnelRow()])
                }
                className="h-11 rounded-2xl border-cyan-400/20 bg-cyan-500/10 px-4 text-cyan-100 hover:bg-cyan-500/20"
              >
                <Plus className="mr-2 h-4 w-4" />
                Add Personnel
              </Button>
            </div>

            {personnelForm.map((row) => (
              <div
                key={row.id}
                className="rounded-[24px] border border-white/10 bg-white/[0.04] p-4"
              >
                <div className="mb-4 flex justify-end">
                  {personnelForm.length > 1 ? (
                    <Button
                      variant="outline"
                      onClick={() =>
                        setPersonnelForm((prev) =>
                          prev.filter((item) => item.id !== row.id)
                        )
                      }
                      className="h-11 rounded-2xl border-rose-400/20 bg-rose-500/10 px-4 text-rose-100 hover:bg-rose-500/20"
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Remove
                    </Button>
                  ) : null}
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
                  <div className="xl:col-span-2">
                    <FieldLabel label="Employee Picker" />
                    <SelectField
                      value={row.employee_user_id || ""}
                      onChange={(event) => {
                        const selectedEmployee = employees.find(
                          (item) => item.id === event.target.value
                        );

                        setPersonnelForm((prev) =>
                          prev.map((item) =>
                            item.id === row.id
                              ? {
                                  ...item,
                                  employee_user_id: event.target.value,
                                  employee_label: selectedEmployee?.label || "",
                                  name:
                                    item.name || selectedEmployee?.label || "",
                                  email:
                                    item.email || selectedEmployee?.email || "",
                                }
                              : item
                          )
                        );
                      }}
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
                      value={row.name || ""}
                      onChange={(event) =>
                        setPersonnelForm((prev) =>
                          prev.map((item) =>
                            item.id === row.id
                              ? { ...item, name: event.target.value }
                              : item
                          )
                        )
                      }
                    />
                  </div>

                  <div>
                    <FieldLabel label="Role / Title" />
                    <InputField
                      value={row.role || ""}
                      onChange={(event) =>
                        setPersonnelForm((prev) =>
                          prev.map((item) =>
                            item.id === row.id
                              ? { ...item, role: event.target.value }
                              : item
                          )
                        )
                      }
                    />
                  </div>

                  <div>
                    <FieldLabel label="Email" />
                    <InputField
                      value={row.email || ""}
                      onChange={(event) =>
                        setPersonnelForm((prev) =>
                          prev.map((item) =>
                            item.id === row.id
                              ? { ...item, email: event.target.value }
                              : item
                          )
                        )
                      }
                    />
                  </div>

                  <div>
                    <FieldLabel label="Phone" />
                    <InputField
                      value={row.phone || ""}
                      onChange={(event) =>
                        setPersonnelForm((prev) =>
                          prev.map((item) =>
                            item.id === row.id
                              ? { ...item, phone: event.target.value }
                              : item
                          )
                        )
                      }
                    />
                  </div>
                </div>
              </div>
            ))}

            {modalError ? (
              <div className="text-sm text-rose-300">{modalError}</div>
            ) : null}
          </div>
        </ModalShell>
      ) : null}

      {editingSection === "communication" ? (
        <ModalShell
          title="Edit Communication"
          description="Manage company, personnel, and other communication channels."
          onClose={() => setEditingSection(null)}
          onSave={() => void saveCommunicationSection()}
          isSaving={isMutating}
        >
          <div className="space-y-4">
            <div className="flex justify-end">
              <Button
                variant="outline"
                onClick={() =>
                  setCommunicationForm((prev) => [...prev, emptyCommunicationRow()])
                }
                className="h-11 rounded-2xl border-cyan-400/20 bg-cyan-500/10 px-4 text-cyan-100 hover:bg-cyan-500/20"
              >
                <Plus className="mr-2 h-4 w-4" />
                Add Communication
              </Button>
            </div>

            {communicationForm.map((row) => (
              <div
                key={row.id}
                className="rounded-[24px] border border-white/10 bg-white/[0.04] p-4"
              >
                <div className="mb-4 flex justify-end">
                  {communicationForm.length > 1 ? (
                    <Button
                      variant="outline"
                      onClick={() =>
                        setCommunicationForm((prev) =>
                          prev.filter((item) => item.id !== row.id)
                        )
                      }
                      className="h-11 rounded-2xl border-rose-400/20 bg-rose-500/10 px-4 text-rose-100 hover:bg-rose-500/20"
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Remove
                    </Button>
                  ) : null}
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                  <div>
                    <FieldLabel label="Label" />
                    <InputField
                      value={row.label || ""}
                      onChange={(event) =>
                        setCommunicationForm((prev) =>
                          prev.map((item) =>
                            item.id === row.id
                              ? { ...item, label: event.target.value }
                              : item
                          )
                        )
                      }
                    />
                  </div>

                  <div>
                    <FieldLabel label="Type" />
                    <SelectField
                      value={row.type || "other"}
                      onChange={(event) =>
                        setCommunicationForm((prev) =>
                          prev.map((item) =>
                            item.id === row.id
                              ? { ...item, type: event.target.value }
                              : item
                          )
                        )
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
                      value={row.email || ""}
                      onChange={(event) =>
                        setCommunicationForm((prev) =>
                          prev.map((item) =>
                            item.id === row.id
                              ? { ...item, email: event.target.value }
                              : item
                          )
                        )
                      }
                    />
                  </div>

                  <div>
                    <FieldLabel label="Phone" />
                    <InputField
                      value={row.phone || ""}
                      onChange={(event) =>
                        setCommunicationForm((prev) =>
                          prev.map((item) =>
                            item.id === row.id
                              ? { ...item, phone: event.target.value }
                              : item
                          )
                        )
                      }
                    />
                  </div>
                </div>
              </div>
            ))}

            {modalError ? (
              <div className="text-sm text-rose-300">{modalError}</div>
            ) : null}
          </div>
        </ModalShell>
      ) : null}

      {editingSection === "addresses" ? (
        <ModalShell
          title="Edit Main Address"
          description="Manage primary billing and registered addresses."
          onClose={() => setEditingSection(null)}
          onSave={() => void saveAddressesSection()}
          isSaving={isMutating}
        >
          <div className="space-y-4">
            <div className="flex justify-end">
              <Button
                variant="outline"
                onClick={() =>
                  setAddressesForm((prev) => [...prev, emptyAddressRow("address")])
                }
                className="h-11 rounded-2xl border-cyan-400/20 bg-cyan-500/10 px-4 text-cyan-100 hover:bg-cyan-500/20"
              >
                <Plus className="mr-2 h-4 w-4" />
                Add Address
              </Button>
            </div>

            {addressesForm.map((row) => (
              <div
                key={row.id}
                className="rounded-[24px] border border-white/10 bg-white/[0.04] p-4"
              >
                <div className="mb-4 flex justify-end">
                  {addressesForm.length > 1 ? (
                    <Button
                      variant="outline"
                      onClick={() =>
                        setAddressesForm((prev) =>
                          prev.filter((item) => item.id !== row.id)
                        )
                      }
                      className="h-11 rounded-2xl border-rose-400/20 bg-rose-500/10 px-4 text-rose-100 hover:bg-rose-500/20"
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Remove
                    </Button>
                  ) : null}
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                  <div>
                    <FieldLabel label="Label" />
                    <InputField
                      value={row.label || ""}
                      onChange={(event) =>
                        setAddressesForm((prev) =>
                          prev.map((item) =>
                            item.id === row.id
                              ? { ...item, label: event.target.value }
                              : item
                          )
                        )
                      }
                    />
                  </div>

                  <div>
                    <FieldLabel label="Country" />
                    <InputField
                      value={row.country || ""}
                      onChange={(event) =>
                        setAddressesForm((prev) =>
                          prev.map((item) =>
                            item.id === row.id
                              ? { ...item, country: event.target.value }
                              : item
                          )
                        )
                      }
                    />
                  </div>

                  <div className="xl:col-span-2">
                    <FieldLabel label="Address Line 1" />
                    <InputField
                      value={row.line1 || ""}
                      onChange={(event) =>
                        setAddressesForm((prev) =>
                          prev.map((item) =>
                            item.id === row.id
                              ? { ...item, line1: event.target.value }
                              : item
                          )
                        )
                      }
                    />
                  </div>

                  <div className="xl:col-span-2">
                    <FieldLabel label="Address Line 2" />
                    <InputField
                      value={row.line2 || ""}
                      onChange={(event) =>
                        setAddressesForm((prev) =>
                          prev.map((item) =>
                            item.id === row.id
                              ? { ...item, line2: event.target.value }
                              : item
                          )
                        )
                      }
                    />
                  </div>
                </div>
              </div>
            ))}

            {modalError ? (
              <div className="text-sm text-rose-300">{modalError}</div>
            ) : null}
          </div>
        </ModalShell>
      ) : null}

 {editingSection === "shipping" ? (
  <ModalShell
    title="Edit Shipping Address"
    description="Manage shipping and delivery addresses."
    onClose={() => setEditingSection(null)}
    onSave={() => void saveShippingSection()}
    isSaving={isMutating}
  >
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button
          variant="outline"
          onClick={() =>
            setShippingForm((prev) => [...prev, emptyAddressRow("shipping")])
          }
          className="h-11 rounded-2xl border-cyan-400/20 bg-cyan-500/10 px-4 text-cyan-100 hover:bg-cyan-500/20"
        >
          <Plus className="mr-2 h-4 w-4" />
          Add Shipping Address
        </Button>
      </div>

      {shippingForm.map((row) => (
        <div
          key={row.id}
          className="rounded-[24px] border border-white/10 bg-white/[0.04] p-4"
        >
          <div className="mb-4 flex justify-end">
            {shippingForm.length > 1 ? (
              <Button
                variant="outline"
                onClick={() =>
                  setShippingForm((prev) =>
                    prev.filter((item) => item.id !== row.id)
                  )
                }
                className="h-11 rounded-2xl border-rose-400/20 bg-rose-500/10 px-4 text-rose-100 hover:bg-rose-500/20"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Remove
              </Button>
            ) : null}
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            <div>
              <FieldLabel label="Label" />
              <InputField
                value={row.label || ""}
                onChange={(event) =>
                  setShippingForm((prev) =>
                    prev.map((item) =>
                      item.id === row.id
                        ? { ...item, label: event.target.value }
                        : item
                    )
                  )
                }
              />
            </div>

            <div>
              <FieldLabel label="Country" />
              <InputField
                value={row.country || ""}
                onChange={(event) =>
                  setShippingForm((prev) =>
                    prev.map((item) =>
                      item.id === row.id
                        ? { ...item, country: event.target.value }
                        : item
                    )
                  )
                }
              />
            </div>

            <div className="xl:col-span-2">
              <FieldLabel label="Address Line 1" />
              <InputField
                value={row.line1 || ""}
                onChange={(event) =>
                  setShippingForm((prev) =>
                    prev.map((item) =>
                      item.id === row.id
                        ? { ...item, line1: event.target.value }
                        : item
                    )
                  )
                }
              />
            </div>

            <div className="xl:col-span-2">
              <FieldLabel label="Address Line 2" />
              <InputField
                value={row.line2 || ""}
                onChange={(event) =>
                  setShippingForm((prev) =>
                    prev.map((item) =>
                      item.id === row.id
                        ? { ...item, line2: event.target.value }
                        : item
                    )
                  )
                }
              />
            </div>
          </div>
        </div>
      ))}

      {modalError ? (
        <div className="text-sm text-rose-300">{modalError}</div>
      ) : null}
    </div>
  </ModalShell>
) : null}

{editingSection === "notes" ? (
  <ModalShell
    title="Edit Notes"
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

    {modalError ? (
      <div className="mt-4 text-sm text-rose-300">{modalError}</div>
    ) : null}
  </ModalShell>
) : null}

</>
  );
}
