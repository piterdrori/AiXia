import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Building2,
  Mail,
  MapPin,
  Pencil,
  Phone,
  RefreshCw,
  ShieldCheck,
  Truck,
  UserRound,
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

type PaymentTermOption = {
  id: string;
  name: string;
  code: string;
  due_days: number;
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
  custom_payment_term?: string | null;
  custom_delivery_term?: string | null;
  custom_currency?: string | null;
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
  payment_terms_id: string | null;
  delivery_term: string | null;
  currency_code: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  metadata: ClientMetadata | null;
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

function SectionCard({
  title,
  description,
  accentClass,
  children,
}: {
  title: string;
  description: string;
  accentClass: string;
  children: React.ReactNode;
}) {
  return (
    <Card className="overflow-hidden rounded-[28px] border border-white/10 bg-white/[0.045] backdrop-blur-xl">
      <CardHeader className="border-b border-white/8 pb-4">
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
      </CardHeader>
      <CardContent className="p-5">{children}</CardContent>
    </Card>
  );
}

function SummaryMetric({
  label,
  value,
  subtitle,
  accentClass,
}: {
  label: string;
  value: string;
  subtitle: string;
  accentClass: string;
}) {
  return (
    <Card className="overflow-hidden rounded-[26px] border border-white/10 bg-white/[0.045] backdrop-blur-xl">
      <CardContent className="p-5">
        <div className={`mb-4 h-1.5 w-16 rounded-full ${accentClass}`} />
        <div className="text-xs uppercase tracking-[0.18em] text-white/35">
          {label}
        </div>
        <div className="mt-2 text-2xl font-semibold text-white">{value}</div>
        <div className="mt-2 text-sm text-white/50">{subtitle}</div>
      </CardContent>
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
      <div className="mt-2 text-sm font-medium text-white break-words">
        {value || "—"}
      </div>
    </div>
  );
}

export default function FinanceMasterDataClientDetailPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();

  const [client, setClient] = useState<ClientDetailRecord | null>(null);
  const [paymentTerms, setPaymentTerms] = useState<PaymentTermOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isMutating, setIsMutating] = useState(false);

  const loadClient = useCallback(async () => {
    if (!id) return;

    setIsLoading(true);

    try {
      const [clientResult, paymentTermsResult] = await Promise.all([
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
              payment_terms_id,
              delivery_term,
              currency_code,
              notes,
              created_at,
              updated_at,
              metadata
            `
          )
          .eq("id", id)
          .single(),
        supabase
          .from("finance_payment_terms")
          .select("id, name, code, due_days")
          .order("due_days", { ascending: true }),
      ]);

      if (clientResult.error) throw clientResult.error;
      if (paymentTermsResult.error) throw paymentTermsResult.error;

      setClient(clientResult.data as ClientDetailRecord);
      setPaymentTerms((paymentTermsResult.data ?? []) as PaymentTermOption[]);
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

  const metadata = useMemo<ClientMetadata>(() => {
    return client?.metadata ?? {};
  }, [client]);

  const personnel = useMemo<ClientPersonnelRow[]>(() => {
    const rows = metadata.personnel ?? [];
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
    const rows = metadata.communications ?? [];
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
    const rows = metadata.addresses ?? [];
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
    const rows = metadata.shipping_addresses ?? [];
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

  const paymentTermLabel = useMemo(() => {
    if (!client) return "—";

    if (metadata.custom_payment_term) return metadata.custom_payment_term;

    const match = paymentTerms.find((item) => item.id === client.payment_terms_id);
    if (!match) return client.payment_terms_id || "—";

    return `${match.code} • ${match.name}`;
  }, [client, metadata.custom_payment_term, paymentTerms]);

  const deliveryTermLabel = useMemo(() => {
    if (!client) return "—";
    return metadata.custom_delivery_term || client.delivery_term || "—";
  }, [client, metadata.custom_delivery_term]);

  const currencyLabel = useMemo(() => {
    if (!client) return "—";
    return metadata.custom_currency || client.currency_code || "—";
  }, [client, metadata.custom_currency]);

  async function handleArchiveToggle() {
    if (!client) return;

    try {
      setIsMutating(true);

      if (client.status === "archived") {
        const updated = await updateClient(client.id, { status: "active" });
        setClient((prev) =>
          prev
            ? {
                ...prev,
                status: updated.status,
                updated_at: updated.updated_at,
              }
            : prev
        );
      } else {
        const updated = await archiveClient(client.id);
        setClient((prev) =>
          prev
            ? {
                ...prev,
                status: updated.status,
                updated_at: updated.updated_at,
              }
            : prev
        );
      }
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
                Read-only finance client profile with personnel, communication,
                address, and default finance settings.
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
                onClick={() =>
                  navigate(`/finance/master-data/clients/${client.id}/edit`)
                }
                className="h-11 rounded-2xl border-cyan-400/20 bg-cyan-500/10 px-4 text-cyan-100 hover:bg-cyan-500/20"
              >
                <Pencil className="mr-2 h-4 w-4" />
                Edit
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
          <section>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
              <SummaryMetric
                label="Payment Terms"
                value={paymentTermLabel}
                subtitle="Settlement behavior"
                accentClass="bg-violet-400"
              />
              <SummaryMetric
                label="Currency"
                value={currencyLabel}
                subtitle="Operational default"
                accentClass="bg-emerald-400"
              />
              <SummaryMetric
                label="Delivery Term"
                value={deliveryTermLabel}
                subtitle="Logistics default"
                accentClass="bg-cyan-400"
              />
              <SummaryMetric
                label="Created"
                value={formatDateLabel(client.created_at)}
                subtitle={`Updated ${formatDateTimeLabel(client.updated_at)}`}
                accentClass="bg-amber-400"
              />
            </div>
          </section>

          <section className="grid grid-cols-1 gap-6 xl:grid-cols-2">
            <SectionCard
              title="Core Client Data"
              description="Main identity and finance-facing profile fields."
              accentClass="bg-[linear-gradient(135deg,rgba(34,211,238,0.18),rgba(59,130,246,0.10))]"
            >
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <DisplayRow label="Client Code" value={client.code || "—"} />
                <DisplayRow label="Status" value={client.status || "—"} />
                <DisplayRow label="Legal Name" value={displayName} />
                <DisplayRow
                  label="Related Personnel"
                  value={client.company_related_personnel || "—"}
                />
                <DisplayRow label="Company Email" value={client.company_email || "—"} />
                <DisplayRow
                  label="Personnel Email"
                  value={client.personnel_email || "—"}
                />
                <DisplayRow label="Company Phone" value={client.company_phone || "—"} />
                <DisplayRow
                  label="Personnel Phone"
                  value={client.personnel_phone || "—"}
                />
                <DisplayRow label="Country" value={client.country || "—"} />
                <DisplayRow label="Notes" value={client.notes || "—"} />
              </div>
            </SectionCard>

            <SectionCard
              title="System Timestamps"
              description="Audit-facing system timestamps for the client record."
              accentClass="bg-[linear-gradient(135deg,rgba(139,92,246,0.18),rgba(34,211,238,0.10))]"
            >
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <DisplayRow
                  label="Created At"
                  value={formatDateTimeLabel(client.created_at)}
                />
                <DisplayRow
                  label="Updated At"
                  value={formatDateTimeLabel(client.updated_at)}
                />
                <DisplayRow label="Payment Terms" value={paymentTermLabel} />
                <DisplayRow label="Delivery Term" value={deliveryTermLabel} />
                <DisplayRow label="Currency" value={currencyLabel} />
                <DisplayRow label="Primary Country" value={client.country || "—"} />
              </div>
            </SectionCard>
          </section>

          <SectionCard
            title="Personnel"
            description="All linked or manually entered personnel records."
            accentClass="bg-[linear-gradient(135deg,rgba(99,102,241,0.18),rgba(139,92,246,0.10))]"
          >
            {personnel.length === 0 ? (
              <div className="text-sm text-white/50">No personnel records found.</div>
            ) : (
              <div className="space-y-4">
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
                          {person.name || person.employee_label || "Unnamed personnel"}
                        </div>
                        <div className="text-sm text-white/50">
                          {person.role || "No role set"}
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
                      <DisplayRow
                        label="Employee Link"
                        value={person.employee_label || person.employee_user_id || "—"}
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
          >
            {communications.length === 0 ? (
              <div className="text-sm text-white/50">
                No communication records found.
              </div>
            ) : (
              <div className="space-y-4">
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

          <section className="grid grid-cols-1 gap-6 xl:grid-cols-2">
            <SectionCard
              title="Main Address"
              description="Primary billing and registered addresses."
              accentClass="bg-[linear-gradient(135deg,rgba(16,185,129,0.18),rgba(34,211,238,0.10))]"
            >
              {addresses.length === 0 ? (
                <div className="text-sm text-white/50">No address records found.</div>
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
                        <DisplayRow label="Country" value={address.country || "—"} />
                        <DisplayRow label="Address Line 1" value={address.line1 || "—"} />
                        <DisplayRow label="Address Line 2" value={address.line2 || "—"} />
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
                        <DisplayRow label="Country" value={address.country || "—"} />
                        <DisplayRow label="Address Line 1" value={address.line1 || "—"} />
                        <DisplayRow label="Address Line 2" value={address.line2 || "—"} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </SectionCard>
          </section>
        </div>
      </div>
    </div>
  );
}
