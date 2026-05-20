import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Archive, ArrowRight, Building2, FileText, Landmark, Loader2, MapPin, Plus, RotateCcw, Sparkles, Truck, UserRound, Users } from "lucide-react";

import {
  AixiaAccessDeniedState,
  AixiaActionStack,
  AixiaAlert,
  AixiaAlertText,
  AixiaButton,
  AixiaCheckboxField,
  AixiaDetailSection,
  AixiaDisplayBlock,
  AixiaEmptyState,
  AixiaFieldLabel,
  AixiaFormField,
  AixiaFormFullWidth,
  AixiaFormGrid,
  AixiaFormRowCard,
  AixiaHero,
  AixiaInputField,
  AixiaLoadingState,
  AixiaNotFoundState,
  FinancePage,
  AixiaReviewBlock,
  AixiaReviewGrid,
  AixiaSection,
  AixiaSelectField,
  AixiaSmartLayout,
  AixiaStatusBadge,
  AixiaTextareaField,
} from "@/components/aixia";
import { archiveClient, updateClient } from "@/lib/finance/clients";
import { type Permission, type Role } from "@/lib/permissions";

import {
  fetchFinanceEffectivePermissions,
  resolveFinancePagePermissionState,
  type FinanceLoadMode,
} from "@/lib/finance/pageAccess";

import { supabase } from "@/lib/supabase";

type LoadMode = FinanceLoadMode;

type ProfilePermissionRow = {
  user_id: string;
  full_name: string | null;
  role: Role | null;
  permissions: Partial<Record<Permission, boolean>> | null;
};

type ClientStatus = "active" | "inactive" | "archived";

type ClientDetailRecord = {
  id: string;
  code: string | null;
  name: string;
  legal_name: string | null;
  contact_person: string | null;
  status: ClientStatus;
  company_email: string | null;
  company_phone: string | null;
  country: string | null;
  address_line_1: string | null;
  address_line_2: string | null;
  shipping_address_line_1: string | null;
  shipping_address_line_2: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

type PersonnelRow = {
  id: string;
  full_name: string | null;
  position: string | null;
  phone: string | null;
  email: string | null;
  sort_order: number;
  is_primary: boolean;
  status: string;
};

type AddressRow = {
  id: string;
  address_type: "primary" | "shipping";
  country: string | null;
  city: string | null;
  state_province: string | null;
  postal_code: string | null;
  address_line_1: string | null;
  address_line_2: string | null;
  sort_order: number;
  is_primary: boolean;
  is_same_as_primary: boolean;
  status: string;
};

type EditSection =
  | null
  | "overview"
  | "personnel"
  | "primary-addresses"
  | "shipping-addresses"
  | "notes";

type OverviewDraft = {
  legal_name: string;
  contact_person: string;
  company_email: string;
  company_phone: string;
  status: ClientStatus;
};

type PersonnelDraftRow = {
  id: string;
  full_name: string;
  position: string;
  phone: string;
  email: string;
};

type AddressDraftRow = {
  id: string;
  country: string;
  city: string;
  state_province: string;
  postal_code: string;
  address_line_1: string;
  address_line_2: string;
};

type ShippingDraftRow = {
  id: string;
  same_as_primary: boolean;
  source_address_id: string;
  country: string;
  city: string;
  state_province: string;
  postal_code: string;
  address_line_1: string;
  address_line_2: string;
};


type SummaryItem = {
  label: string;
  value: string;
  description: string;
};

const EMPTY_OVERVIEW_DRAFT: OverviewDraft = {
  legal_name: "",
  contact_person: "",
  company_email: "",
  company_phone: "",
  status: "active",
};

function makeId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function createEmptyPersonnelDraftRow(): PersonnelDraftRow {
  return {
    id: makeId(),
    full_name: "",
    position: "",
    phone: "",
    email: "",
  };
}

function createEmptyAddressDraftRow(): AddressDraftRow {
  return {
    id: makeId(),
    country: "",
    city: "",
    state_province: "",
    postal_code: "",
    address_line_1: "",
    address_line_2: "",
  };
}

function createEmptyShippingDraftRow(): ShippingDraftRow {
  return {
    id: makeId(),
    same_as_primary: false,
    source_address_id: "",
    country: "",
    city: "",
    state_province: "",
    postal_code: "",
    address_line_1: "",
    address_line_2: "",
  };
}

const CLIENT_DETAIL_ACCESS_CONFIG = {
  sectionKey: "masterData",
  adminPermissions: ["manageFinanceMasterData"],
  readPermissions: ["accessFinance", "viewFinance", "viewClients", "manageClients"],
  createPermissions: ["createFinanceRecords", "manageClients"],
  updatePermissions: ["editFinanceRecords", "manageClients"],
  deleteArchivePermissions: ["archiveFinanceRecords", "manageClients"],
} as const;

async function loadClientDetailEffectivePermissions(
  userId: string,
  mode: LoadMode
): Promise<Partial<Record<Permission, boolean>> | null> {
  return fetchFinanceEffectivePermissions(userId, mode, "Clients");
}

function normalizeStatus(value: string): ClientStatus {
  if (value === "inactive" || value === "archived") {
    return value;
  }

  return "active";
}

function formatDateTimeLabel(value: string | null | undefined) {
  if (!value) return "—";

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;

  return parsed.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatStatus(value: string | null | undefined) {
  if (!value) return "Unknown";

  return value
    .split("_")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function getClientDisplayName(client: ClientDetailRecord | null) {
  if (!client) return "Client";
  return client.legal_name || client.name || "Client";
}

function getClientContactLabel(client: ClientDetailRecord | null) {
  return client?.contact_person || "No primary contact";
}

function getClientEmailLabel(client: ClientDetailRecord | null) {
  return client?.company_email || "No email";
}

function getClientPhoneLabel(client: ClientDetailRecord | null) {
  return client?.company_phone || "No phone";
}

function getPrimaryAddressSummary(addresses: AddressRow[]) {
  const primary = addresses[0];

  if (!primary) {
    return "No primary address";
  }

  const parts = [
    primary.address_line_1,
    primary.city,
    primary.state_province,
    primary.country,
  ].filter(Boolean);

  return parts.length > 0 ? parts.join(", ") : "Primary address incomplete";
}

function getShippingSummary(shippingAddresses: AddressRow[]) {
  if (shippingAddresses.length === 0) {
    return "No shipping address";
  }

  const sameAsPrimaryCount = shippingAddresses.filter(
    (row) => row.is_same_as_primary
  ).length;

  if (sameAsPrimaryCount > 0) {
    return `${shippingAddresses.length} shipping row${
      shippingAddresses.length === 1 ? "" : "s"
    }, ${sameAsPrimaryCount} same as primary`;
  }

  return `${shippingAddresses.length} shipping row${
    shippingAddresses.length === 1 ? "" : "s"
  }`;
}

function getPersonnelSummary(personnel: PersonnelRow[]) {
  if (personnel.length === 0) {
    return "No personnel";
  }

  const first = personnel[0];
  return first.full_name || first.email || `${personnel.length} personnel rows`;
}

function mapPrimaryAddressToDraft(row: AddressRow): AddressDraftRow {
  return {
    id: row.id,
    country: row.country || "",
    city: row.city || "",
    state_province: row.state_province || "",
    postal_code: row.postal_code || "",
    address_line_1: row.address_line_1 || "",
    address_line_2: row.address_line_2 || "",
  };
}

function mapShippingAddressToDraft(row: AddressRow): ShippingDraftRow {
  return {
    id: row.id,
    same_as_primary: row.is_same_as_primary,
    source_address_id: "",
    country: row.country || "",
    city: row.city || "",
    state_province: row.state_province || "",
    postal_code: row.postal_code || "",
    address_line_1: row.address_line_1 || "",
    address_line_2: row.address_line_2 || "",
  };
}

function isSamePrimarySummary(row: ShippingDraftRow) {
  return row.same_as_primary ? "Linked to a primary address." : "Standalone shipping address.";
}

export default function FinanceMasterDataClientDetailPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();

  const [profile, setProfile] = useState<ProfilePermissionRow | null>(null);
  const [effectivePermissions, setEffectivePermissions] =
    useState<Record<Permission, boolean> | null>(null);
  const [client, setClient] = useState<ClientDetailRecord | null>(null);
  const [personnel, setPersonnel] = useState<PersonnelRow[]>([]);
  const [addresses, setAddresses] = useState<AddressRow[]>([]);
  const [shippingAddresses, setShippingAddresses] = useState<AddressRow[]>([]);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const [isLoadingClient, setIsLoadingClient] = useState(true);
  const [, setBackgroundRefreshing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLifecycleRunning, setIsLifecycleRunning] = useState(false);
  const [editingSection, setEditingSection] = useState<EditSection>(null);
  const [pageError, setPageError] = useState<string | null>(null);
  const [pageMessage, setPageMessage] = useState<string | null>(null);

  const [overviewDraft, setOverviewDraft] =
    useState<OverviewDraft>(EMPTY_OVERVIEW_DRAFT);
  const [personnelDraft, setPersonnelDraft] = useState<PersonnelDraftRow[]>([
    createEmptyPersonnelDraftRow(),
  ]);
  const [addressDraft, setAddressDraft] = useState<AddressDraftRow[]>([
    createEmptyAddressDraftRow(),
  ]);
  const [shippingDraft, setShippingDraft] = useState<ShippingDraftRow[]>([
    createEmptyShippingDraftRow(),
  ]);
  const [notesDraft, setNotesDraft] = useState("");

  const loadCurrentProfile = useCallback(async (mode: LoadMode = "initial") => {
    if (mode === "initial") {
      setIsLoadingProfile(true);
    } else {
      setBackgroundRefreshing(true);
    }

    try {
      const authResult = await supabase.auth.getUser();
      if (authResult.error) throw authResult.error;

      const authUserId = authResult.data.user?.id;

      if (!authUserId) {
        if (mode === "initial") {
          setProfile(null);
          setEffectivePermissions(null);
        } else {
          console.warn(
            "Silent client ID profile refresh returned no auth user; keeping current profile and permissions."
          );
        }

        return;
      }

      const profileResult = await supabase
        .from("profiles")
        .select("user_id, full_name, role, permissions")
        .eq("user_id", authUserId)
        .maybeSingle();

      if (profileResult.error) throw profileResult.error;

      const loadedProfile = (profileResult.data || null) as ProfilePermissionRow | null;

      if (!loadedProfile) {
        if (mode === "initial") {
          setProfile(null);
          setEffectivePermissions(null);
        } else {
          console.warn(
            "Silent client ID profile refresh returned no profile; keeping current profile and permissions."
          );
        }

        return;
      }

      const backendPermissions = await loadClientDetailEffectivePermissions(authUserId, mode);

      setProfile(loadedProfile);

      if (!loadedProfile.role) {
        if (mode === "initial") {
          setEffectivePermissions(null);
        } else {
          console.warn(
            "Silent client ID profile refresh returned no role; keeping current permissions."
          );
        }

        return;
      }

      const resolvedPermissions = backendPermissions || loadedProfile.permissions || null;

      if (!resolvedPermissions && mode === "silent") {
        console.warn(
          "Silent client ID permission refresh returned no permission payload; keeping current permissions."
        );
        return;
      }

      setEffectivePermissions(
        resolvedPermissions as Record<Permission, boolean> | null
      );
    } catch (error) {
      console.error("Failed to load client ID permissions:", error);

      if (mode === "initial") {
        setProfile(null);
        setEffectivePermissions(null);
      }
    } finally {
      if (mode === "initial") {
        setIsLoadingProfile(false);
      } else {
        setBackgroundRefreshing(false);
      }
    }
  }, []);

  const loadClient = useCallback(async (mode: LoadMode = "initial") => {
    if (!id) return;

    if (mode === "initial") {
      setIsLoadingClient(true);
      setPageError(null);
    } else {
      setBackgroundRefreshing(true);
    }

    try {
      const [clientResult, personnelResult, addressResult] = await Promise.all([
        supabase
          .from("finance_clients")
          .select(
            `
              id,
              code,
              name,
              legal_name,
              contact_person,
              status,
              company_email,
              company_phone,
              country,
              address_line_1,
              address_line_2,
              shipping_address_line_1,
              shipping_address_line_2,
              notes,
              created_at,
              updated_at
            `
          )
          .eq("id", id)
          .single(),
        supabase
          .from("finance_client_personnel")
          .select(
            `
              id,
              full_name,
              position,
              phone,
              email,
              sort_order,
              is_primary,
              status
            `
          )
          .eq("client_id", id)
          .order("sort_order", { ascending: true }),
        supabase
          .from("finance_client_addresses")
          .select(
            `
              id,
              address_type,
              country,
              city,
              state_province,
              postal_code,
              address_line_1,
              address_line_2,
              sort_order,
              is_primary,
              is_same_as_primary,
              status
            `
          )
          .eq("client_id", id)
          .order("address_type", { ascending: true })
          .order("sort_order", { ascending: true }),
      ]);

      if (clientResult.error) throw clientResult.error;
      if (personnelResult.error) throw personnelResult.error;
      if (addressResult.error) throw addressResult.error;

      const clientData = clientResult.data as ClientDetailRecord;
      const personnelData = (personnelResult.data ?? []) as PersonnelRow[];
      const addressData = (addressResult.data ?? []) as AddressRow[];

      setClient(clientData);
      setPersonnel(personnelData);
      setAddresses(addressData.filter((row) => row.address_type === "primary"));
      setShippingAddresses(
        addressData.filter((row) => row.address_type === "shipping")
      );

      if (mode === "initial") {
        setPageError(null);
      }
    } catch (error) {
      console.error("Failed to load finance client details:", error);

      if (mode === "initial") {
        setClient(null);
        setPersonnel([]);
        setAddresses([]);
        setShippingAddresses([]);
        setPageError(
          error instanceof Error
            ? error.message
            : "Failed to load finance client details."
        );
      }
    } finally {
      if (mode === "initial") {
        setIsLoadingClient(false);
      } else {
        setBackgroundRefreshing(false);
      }
    }
  }, [id]);

  useEffect(() => {
    void Promise.all([
      loadCurrentProfile("initial"),
      loadClient("initial"),
    ]);
  }, [loadClient, loadCurrentProfile]);

  useEffect(() => {
    const channel = supabase
      .channel("finance-master-data-client-id-page")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "profiles" },
        () => void loadCurrentProfile("silent")
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "finance_permission_templates" },
        () => void loadCurrentProfile("silent")
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "finance_user_permission_templates" },
        () => void loadCurrentProfile("silent")
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "finance_clients" },
        () => void loadClient("silent")
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "finance_client_personnel" },
        () => void loadClient("silent")
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "finance_client_addresses" },
        () => void loadClient("silent")
      )
      .subscribe();

    const intervalId = window.setInterval(() => {
      void Promise.all([
        loadCurrentProfile("silent"),
        loadClient("silent"),
      ]);
    }, 60000);

    return () => {
      window.clearInterval(intervalId);
      void supabase.removeChannel(channel);
    };
  }, [loadClient, loadCurrentProfile]);

  const permissionState = useMemo(() => {
    return resolveFinancePagePermissionState({
      profileRole: profile?.role,
      permissions: effectivePermissions,
      config: CLIENT_DETAIL_ACCESS_CONFIG,
    });
  }, [effectivePermissions, profile]);

  const primaryAddressOptions = useMemo(() => {
    return addressDraft.map((address, index) => ({
      id: address.id,
      label:
        address.address_line_1.trim() ||
        address.city.trim() ||
        address.country.trim() ||
        `Address ${index + 1}`,
      value: address,
    }));
  }, [addressDraft]);

const summaryItems = useMemo<SummaryItem[]>(() => {
    return [
      {
        label: "Client",
        value: getClientDisplayName(client),
        description: client?.code || "No client code",
      },
      {
        label: "Contact",
        value: getClientContactLabel(client),
        description: `${getClientEmailLabel(client)} • ${getClientPhoneLabel(client)}`,
      },
      {
        label: "Personnel",
        value: `${personnel.length} Row${personnel.length === 1 ? "" : "s"}`,
        description: getPersonnelSummary(personnel),
      },
      {
        label: "Lifecycle",
        value: formatStatus(client?.status),
        description: getPrimaryAddressSummary(addresses),
      },
    ];
  }, [addresses, client, personnel]);

  function cancelEditing() {
    setEditingSection(null);
    setPageError(null);
  }

  function openOverviewEditor() {
    if (!client || !permissionState.canUpdate) return;

    setPageError(null);
    setPageMessage(null);
    setOverviewDraft({
      legal_name: client.legal_name || client.name || "",
      contact_person: client.contact_person || "",
      company_email: client.company_email || "",
      company_phone: client.company_phone || "",
      status: client.status,
    });
    setEditingSection("overview");
  }

  function openPersonnelEditor() {
    if (!permissionState.canUpdate) return;

    setPageError(null);
    setPageMessage(null);
    setPersonnelDraft(
      personnel.length > 0
        ? personnel.map((row) => ({
            id: row.id,
            full_name: row.full_name || "",
            position: row.position || "",
            phone: row.phone || "",
            email: row.email || "",
          }))
        : [createEmptyPersonnelDraftRow()]
    );
    setEditingSection("personnel");
  }

  function openPrimaryAddressEditor() {
    if (!permissionState.canUpdate) return;

    setPageError(null);
    setPageMessage(null);
    setAddressDraft(
      addresses.length > 0
        ? addresses.map(mapPrimaryAddressToDraft)
        : [createEmptyAddressDraftRow()]
    );
    setEditingSection("primary-addresses");
  }

  function openShippingAddressEditor() {
    if (!permissionState.canUpdate) return;

    setPageError(null);
    setPageMessage(null);
    setAddressDraft(
      addresses.length > 0
        ? addresses.map(mapPrimaryAddressToDraft)
        : [createEmptyAddressDraftRow()]
    );
    setShippingDraft(
      shippingAddresses.length > 0
        ? shippingAddresses.map(mapShippingAddressToDraft)
        : [createEmptyShippingDraftRow()]
    );
    setEditingSection("shipping-addresses");
  }

  function openNotesEditor() {
    if (!client || !permissionState.canUpdate) return;

    setPageError(null);
    setPageMessage(null);
    setNotesDraft(client.notes || "");
    setEditingSection("notes");
  }

  function updateOverviewDraft<K extends keyof OverviewDraft>(
    key: K,
    value: OverviewDraft[K]
  ) {
    setOverviewDraft((previousDraft) => ({
      ...previousDraft,
      [key]: value,
    }));
  }

  function updatePersonnelDraftRow(
    rowId: string,
    key: keyof PersonnelDraftRow,
    value: string
  ) {
    setPersonnelDraft((previousDraft) =>
      previousDraft.map((row) =>
        row.id === rowId ? { ...row, [key]: value } : row
      )
    );
  }

  function addPersonnelDraftRow() {
    setPersonnelDraft((previousDraft) => [
      ...previousDraft,
      createEmptyPersonnelDraftRow(),
    ]);
  }

  function removePersonnelDraftRow(rowId: string) {
    setPersonnelDraft((previousDraft) =>
      previousDraft.length > 1
        ? previousDraft.filter((row) => row.id !== rowId)
        : previousDraft
    );
  }

  function updateAddressDraftRow(
    rowId: string,
    key: keyof AddressDraftRow,
    value: string
  ) {
    setAddressDraft((previousAddressDraft) => {
      const nextAddresses = previousAddressDraft.map((row) =>
        row.id === rowId ? { ...row, [key]: value } : row
      );

      setShippingDraft((previousShippingDraft) =>
        previousShippingDraft.map((shipping) => {
          if (!shipping.same_as_primary || shipping.source_address_id !== rowId) {
            return shipping;
          }

          const source = nextAddresses.find((address) => address.id === rowId);
          if (!source) return shipping;

          return {
            ...shipping,
            country: source.country,
            city: source.city,
            state_province: source.state_province,
            postal_code: source.postal_code,
            address_line_1: source.address_line_1,
            address_line_2: source.address_line_2,
          };
        })
      );

      return nextAddresses;
    });
  }

  function addAddressDraftRow() {
    setAddressDraft((previousDraft) => [
      ...previousDraft,
      createEmptyAddressDraftRow(),
    ]);
  }

  function removeAddressDraftRow(rowId: string) {
    setAddressDraft((previousDraft) =>
      previousDraft.length > 1
        ? previousDraft.filter((row) => row.id !== rowId)
        : previousDraft
    );

    setShippingDraft((previousDraft) =>
      previousDraft.map((shipping) =>
        shipping.source_address_id === rowId
          ? {
              ...shipping,
              same_as_primary: false,
              source_address_id: "",
              country: "",
              city: "",
              state_province: "",
              postal_code: "",
              address_line_1: "",
              address_line_2: "",
            }
          : shipping
      )
    );
  }

  function updateShippingDraftRow(
    rowId: string,
    key: keyof ShippingDraftRow,
    value: string | boolean
  ) {
    setShippingDraft((previousDraft) =>
      previousDraft.map((row) => {
        if (row.id !== rowId) return row;

        if (key === "same_as_primary") {
          const nextSame = Boolean(value);

          if (!nextSame) {
            return {
              ...row,
              same_as_primary: false,
              source_address_id: "",
              country: "",
              city: "",
              state_province: "",
              postal_code: "",
              address_line_1: "",
              address_line_2: "",
            };
          }

          const source = addressDraft.find(
            (address) => address.id === row.source_address_id
          );

          return {
            ...row,
            same_as_primary: true,
            country: source?.country ?? "",
            city: source?.city ?? "",
            state_province: source?.state_province ?? "",
            postal_code: source?.postal_code ?? "",
            address_line_1: source?.address_line_1 ?? "",
            address_line_2: source?.address_line_2 ?? "",
          };
        }

        if (key === "source_address_id") {
          const sourceAddressId = String(value);
          const source = addressDraft.find(
            (address) => address.id === sourceAddressId
          );

          return {
            ...row,
            source_address_id: sourceAddressId,
            same_as_primary: true,
            country: source?.country ?? "",
            city: source?.city ?? "",
            state_province: source?.state_province ?? "",
            postal_code: source?.postal_code ?? "",
            address_line_1: source?.address_line_1 ?? "",
            address_line_2: source?.address_line_2 ?? "",
          };
        }

        return {
          ...row,
          [key]: value,
        };
      })
    );
  }

  function addShippingDraftRow() {
    setShippingDraft((previousDraft) => [
      ...previousDraft,
      createEmptyShippingDraftRow(),
    ]);
  }

  function removeShippingDraftRow(rowId: string) {
    setShippingDraft((previousDraft) =>
      previousDraft.length > 1
        ? previousDraft.filter((row) => row.id !== rowId)
        : previousDraft
    );
  }

  async function saveOverviewSection() {
    if (!client || !permissionState.canUpdate) return;

    const legalName = overviewDraft.legal_name.trim();

    if (!legalName) {
      setPageError("Legal name is required.");
      return;
    }

    const normalizedStatus = normalizeStatus(overviewDraft.status);

    if (
      normalizedStatus === "archived" &&
      client.status !== "archived" &&
      !permissionState.canDeleteArchive
    ) {
      setPageError("Delete/Archive access is required to archive this client.");
      return;
    }

    if (
      client.status === "archived" &&
      normalizedStatus !== "archived" &&
      !permissionState.canDeleteArchive
    ) {
      setPageError("Delete/Archive access is required to restore this client.");
      return;
    }

    try {
      setIsSaving(true);
      setPageError(null);
      setPageMessage(null);

      await updateClient(client.id, {
        legal_name: legalName,
        contact_person: overviewDraft.contact_person.trim() || null,
        company_email: overviewDraft.company_email.trim() || null,
        company_phone: overviewDraft.company_phone.trim() || null,
        company_related_personnel:
          overviewDraft.contact_person.trim() || null,
        status: normalizedStatus,
      });

      setEditingSection(null);
      setPageMessage("Client overview updated.");
      await loadClient("silent");
    } catch (error) {
      console.error("Failed to save client overview:", error);
      setPageError(
        error instanceof Error ? error.message : "Failed to save client overview."
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function savePersonnelSection() {
    if (!client || !permissionState.canUpdate) return;

    try {
      setIsSaving(true);
      setPageError(null);
      setPageMessage(null);

      const { error: deleteError } = await supabase
        .from("finance_client_personnel")
        .delete()
        .eq("client_id", client.id);

      if (deleteError) throw deleteError;

      const payload = personnelDraft
        .map((row, index) => ({
          client_id: client.id,
          full_name: row.full_name.trim() || null,
          position: row.position.trim() || null,
          phone: row.phone.trim() || null,
          email: row.email.trim() || null,
          sort_order: index,
          is_primary: index === 0,
          status: "active",
        }))
        .filter(
          (row) => row.full_name || row.position || row.phone || row.email
        );

      if (payload.length > 0) {
        const { error } = await supabase
          .from("finance_client_personnel")
          .insert(payload);

        if (error) throw error;
      }

      setEditingSection(null);
      setPageMessage("Client personnel updated.");
      await loadClient("silent");
    } catch (error) {
      console.error("Failed to save client personnel:", error);
      setPageError(
        error instanceof Error ? error.message : "Failed to save client personnel."
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function savePrimaryAddressSection() {
    if (!client || !permissionState.canUpdate) return;

    try {
      setIsSaving(true);
      setPageError(null);
      setPageMessage(null);

      const { error: deleteError } = await supabase
        .from("finance_client_addresses")
        .delete()
        .eq("client_id", client.id)
        .eq("address_type", "primary");

      if (deleteError) throw deleteError;

      const payload = addressDraft
        .map((row, index) => ({
          client_id: client.id,
          address_type: "primary" as const,
          country: row.country.trim() || null,
          city: row.city.trim() || null,
          state_province: row.state_province.trim() || null,
          postal_code: row.postal_code.trim() || null,
          address_line_1: row.address_line_1.trim() || null,
          address_line_2: row.address_line_2.trim() || null,
          sort_order: index,
          is_primary: index === 0,
          is_same_as_primary: false,
          status: "active",
        }))
        .filter(
          (row) =>
            row.country ||
            row.city ||
            row.state_province ||
            row.postal_code ||
            row.address_line_1 ||
            row.address_line_2
        );

      if (payload.length > 0) {
        const { error } = await supabase
          .from("finance_client_addresses")
          .insert(payload);

        if (error) throw error;
      }

      await updateClient(client.id, {
        country: addressDraft[0]?.country.trim() || null,
        address_line_1: addressDraft[0]?.address_line_1.trim() || null,
        address_line_2: addressDraft[0]?.address_line_2.trim() || null,
      });

      setEditingSection(null);
      setPageMessage("Primary addresses updated.");
      await loadClient("silent");
    } catch (error) {
      console.error("Failed to save primary addresses:", error);
      setPageError(
        error instanceof Error ? error.message : "Failed to save primary addresses."
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function saveShippingAddressSection() {
    if (!client || !permissionState.canUpdate) return;

    try {
      setIsSaving(true);
      setPageError(null);
      setPageMessage(null);

      const { error: deleteError } = await supabase
        .from("finance_client_addresses")
        .delete()
        .eq("client_id", client.id)
        .eq("address_type", "shipping");

      if (deleteError) throw deleteError;

      const payload = shippingDraft
        .map((row, index) => ({
          client_id: client.id,
          address_type: "shipping" as const,
          country: row.same_as_primary ? null : row.country.trim() || null,
          city: row.same_as_primary ? null : row.city.trim() || null,
          state_province: row.same_as_primary
            ? null
            : row.state_province.trim() || null,
          postal_code: row.same_as_primary ? null : row.postal_code.trim() || null,
          address_line_1: row.same_as_primary
            ? null
            : row.address_line_1.trim() || null,
          address_line_2: row.same_as_primary
            ? null
            : row.address_line_2.trim() || null,
          sort_order: index,
          is_primary: index === 0,
          is_same_as_primary: row.same_as_primary,
          status: "active",
        }))
        .filter(
          (row) =>
            row.is_same_as_primary ||
            row.country ||
            row.city ||
            row.state_province ||
            row.postal_code ||
            row.address_line_1 ||
            row.address_line_2
        );

      if (payload.length > 0) {
        const { error } = await supabase
          .from("finance_client_addresses")
          .insert(payload);

        if (error) throw error;
      }

      await updateClient(client.id, {
        shipping_address_line_1: shippingDraft[0]?.same_as_primary
          ? null
          : shippingDraft[0]?.address_line_1.trim() || null,
        shipping_address_line_2: shippingDraft[0]?.same_as_primary
          ? null
          : shippingDraft[0]?.address_line_2.trim() || null,
      });

      setEditingSection(null);
      setPageMessage("Shipping addresses updated.");
      await loadClient("silent");
    } catch (error) {
      console.error("Failed to save shipping addresses:", error);
      setPageError(
        error instanceof Error ? error.message : "Failed to save shipping addresses."
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function saveNotesSection() {
    if (!client || !permissionState.canUpdate) return;

    try {
      setIsSaving(true);
      setPageError(null);
      setPageMessage(null);

      await updateClient(client.id, {
        notes: notesDraft.trim() || null,
      });

      setEditingSection(null);
      setPageMessage("Client notes updated.");
      await loadClient("silent");
    } catch (error) {
      console.error("Failed to save client notes:", error);
      setPageError(
        error instanceof Error ? error.message : "Failed to save client notes."
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function handleArchiveToggle() {
    if (!client || !permissionState.canDeleteArchive || isLifecycleRunning) return;

    try {
      setIsLifecycleRunning(true);
      setPageError(null);
      setPageMessage(null);

      if (client.status === "archived") {
        await updateClient(client.id, { status: "active" });
        setPageMessage("Client restored.");
      } else {
        await archiveClient(client.id);
        setPageMessage("Client archived.");
      }

      await loadClient("silent");
    } catch (error) {
      console.error("Failed to update client lifecycle:", error);
      setPageError(
        error instanceof Error
          ? error.message
          : "Failed to update client lifecycle."
      );
    } finally {
      setIsLifecycleRunning(false);
    }
  }

  const isPageLoading = isLoadingProfile || isLoadingClient;

  if (isPageLoading) {
    return (
      <AixiaLoadingState
        title="Loading client detail"
        description="Client record and permission state are being checked."
      />
    );
  }

  if (!client) {
    return (
      <FinancePage>
        <AixiaNotFoundState
          title="Client not found"
          description="The client record could not be loaded or no longer exists."
          action={
            <AixiaButton
              type="button"
              variant="secondary"
              onClick={() => navigate("/finance/master-data/clients")}
            >
              <ArrowRight className="h-4 w-4 rotate-180" />
              Clients
            </AixiaButton>
          }
        />
      </FinancePage>
    );
  }

  if (!permissionState.canRead) {
    return (
      <FinancePage>
        <AixiaHero
        className="shrink-0 space-y-4"
        surface="command"
          parentLabel="Clients"
          parentPath="/finance/master-data/clients"
          gradientTitle="Client"
          title="Access Locked"
          subtitle="Read Permission Required"
          />

      <div className="aixia-command-scroll">
<AixiaAccessDeniedState
          title="No client read access"
          description="Ask an Admin to assign a Finance role template or user-specific exception with Client read access."
        />
      </div>
    </FinancePage>
    );
  }

  return (
    <FinancePage>
      <AixiaHero
        className="shrink-0 space-y-4"
        surface="command"
        parentLabel="Clients"
        parentPath="/finance/master-data/clients"
        gradientTitle={getClientDisplayName(client)}
        title="Client"
        subtitle="Finance Customer Master Data"
        />

      <div className="aixia-command-scroll">
{pageError ? <AixiaAlert tone="error">{pageError}</AixiaAlert> : null}
      {pageMessage ? <AixiaAlert tone="success">{pageMessage}</AixiaAlert> : null}

      <AixiaSmartLayout
        sidebar="normal"
        balance="main"
        bottomSpan="never"
        sideRebalance="last-to-bottom"
        mainTopCount={3}
        main={
          <>
            <AixiaDetailSection
              title="Client Overview"
              description="Legal identity, primary contact, communication, and lifecycle status."
              icon={Building2}
              isEditing={editingSection === "overview"}
              canEdit={permissionState.canUpdate}
              onEdit={openOverviewEditor}
              onCancel={cancelEditing}
              onSave={() => void saveOverviewSection()}
              isSaving={isSaving}
            >
              {editingSection === "overview" ? (
                <AixiaFormGrid columns="two">
                  <AixiaFormFullWidth>
                    <AixiaFieldLabel label="Legal Name" required />
                    <AixiaInputField
                      value={overviewDraft.legal_name}
                      disabled={isSaving}
                      onChange={(event) =>
                        updateOverviewDraft("legal_name", event.target.value)
                      }
                      placeholder="Legal company name"
                    />
                  </AixiaFormFullWidth>

                  <AixiaFormField>
                    <AixiaFieldLabel label="Primary Contact" />
                    <AixiaInputField
                      value={overviewDraft.contact_person}
                      disabled={isSaving}
                      onChange={(event) =>
                        updateOverviewDraft("contact_person", event.target.value)
                      }
                      placeholder="Primary contact"
                    />
                  </AixiaFormField>

                  <AixiaFormField>
                    <AixiaFieldLabel label="Company Email" />
                    <AixiaInputField
                      type="email"
                      value={overviewDraft.company_email}
                      disabled={isSaving}
                      onChange={(event) =>
                        updateOverviewDraft("company_email", event.target.value)
                      }
                      placeholder="company@email.com"
                    />
                  </AixiaFormField>

                  <AixiaFormField>
                    <AixiaFieldLabel label="Company Phone" />
                    <AixiaInputField
                      value={overviewDraft.company_phone}
                      disabled={isSaving}
                      onChange={(event) =>
                        updateOverviewDraft("company_phone", event.target.value)
                      }
                      placeholder="Company phone"
                    />
                  </AixiaFormField>

                  <AixiaFormField>
                    <AixiaFieldLabel label="Status" />
                    <AixiaSelectField
                      value={overviewDraft.status}
                      disabled={isSaving}
                      onChange={(event) =>
                        updateOverviewDraft("status", normalizeStatus(event.target.value))
                      }
                    >
                      <option value="active" className="bg-[#05070d]">
                        Active
                      </option>
                      <option value="inactive" className="bg-[#05070d]">
                        Inactive
                      </option>
                      <option value="archived" className="bg-[#05070d]">
                        Archived
                      </option>
                    </AixiaSelectField>
                  </AixiaFormField>
                </AixiaFormGrid>
              ) : (
                <AixiaFormGrid columns="two">
                  <AixiaDisplayBlock label="Legal Name" value={getClientDisplayName(client)} />
                  <AixiaDisplayBlock label="Client Code" value={client.code || "—"} />
                  <AixiaDisplayBlock
                    label="Primary Contact"
                    value={client.contact_person || "—"}
                  />
                  <AixiaDisplayBlock
                    label="Company Email"
                    value={client.company_email || "—"}
                    detail={client.company_email ? "Communication email" : undefined}
                  />
                  <AixiaDisplayBlock
                    label="Company Phone"
                    value={client.company_phone || "—"}
                    detail={client.company_phone ? "Communication phone" : undefined}
                  />
                  <AixiaDisplayBlock
                    label="Lifecycle Status"
                    value={<AixiaStatusBadge value={client.status} />}
                  />
                </AixiaFormGrid>
              )}
            </AixiaDetailSection>

            <AixiaDetailSection
              title="Personnel"
              description="People connected to this client."
              icon={Users}
              isEditing={editingSection === "personnel"}
              canEdit={permissionState.canUpdate}
              onEdit={openPersonnelEditor}
              onCancel={cancelEditing}
              onSave={() => void savePersonnelSection()}
              isSaving={isSaving}
            >
              {editingSection === "personnel" ? (
                <>
                  <AixiaActionStack>
                    <AixiaButton
                      type="button"
                      variant="secondary"
                      onClick={addPersonnelDraftRow}
                      disabled={isSaving}
                    >
                      <Plus className="h-4 w-4" />
                      Add Person
                    </AixiaButton>
                  </AixiaActionStack>

                  <div className="aixia-form-row-list">
                    {personnelDraft.map((row, index) => (
                      <AixiaFormRowCard
                        key={row.id}
                        title={`Person ${index + 1}`}
                        description={index === 0 ? "Primary personnel row." : undefined}
                        onRemove={() => removePersonnelDraftRow(row.id)}
                        removeDisabled={isSaving || personnelDraft.length === 1}
                      >
                        <AixiaFormGrid columns="two">
                          <AixiaFormField>
                            <AixiaFieldLabel label="Name" />
                            <AixiaInputField
                              value={row.full_name}
                              disabled={isSaving}
                              onChange={(event) =>
                                updatePersonnelDraftRow(
                                  row.id,
                                  "full_name",
                                  event.target.value
                                )
                              }
                              placeholder="Person name"
                            />
                          </AixiaFormField>

                          <AixiaFormField>
                            <AixiaFieldLabel label="Position" />
                            <AixiaInputField
                              value={row.position}
                              disabled={isSaving}
                              onChange={(event) =>
                                updatePersonnelDraftRow(
                                  row.id,
                                  "position",
                                  event.target.value
                                )
                              }
                              placeholder="Position"
                            />
                          </AixiaFormField>

                          <AixiaFormField>
                            <AixiaFieldLabel label="Phone" />
                            <AixiaInputField
                              value={row.phone}
                              disabled={isSaving}
                              onChange={(event) =>
                                updatePersonnelDraftRow(
                                  row.id,
                                  "phone",
                                  event.target.value
                                )
                              }
                              placeholder="Phone"
                            />
                          </AixiaFormField>

                          <AixiaFormField>
                            <AixiaFieldLabel label="Email" />
                            <AixiaInputField
                              type="email"
                              value={row.email}
                              disabled={isSaving}
                              onChange={(event) =>
                                updatePersonnelDraftRow(
                                  row.id,
                                  "email",
                                  event.target.value
                                )
                              }
                              placeholder="Email"
                            />
                          </AixiaFormField>
                        </AixiaFormGrid>
                      </AixiaFormRowCard>
                    ))}
                  </div>
                </>
              ) : personnel.length === 0 ? (
                <AixiaEmptyState
                  icon={UserRound}
                  title="No personnel added yet"
                  description="Client personnel records will appear here after they are added."
                />
              ) : (
                <div className="aixia-form-row-list">
                  {personnel.map((row, index) => (
                    <AixiaFormRowCard
                      key={row.id}
                      title={`Person ${index + 1}`}
                      description={row.is_primary ? "Primary personnel row." : undefined}
                    >
                      <AixiaFormGrid columns="two">
                        <AixiaDisplayBlock label="Name" value={row.full_name || "—"} />
                        <AixiaDisplayBlock label="Position" value={row.position || "—"} />
                        <AixiaDisplayBlock label="Phone" value={row.phone || "—"} />
                        <AixiaDisplayBlock label="Email" value={row.email || "—"} />
                      </AixiaFormGrid>
                    </AixiaFormRowCard>
                  ))}
                </div>
              )}
            </AixiaDetailSection>

            <AixiaDetailSection
              title="Primary Addresses"
              description="Primary legal and billing addresses."
              icon={MapPin}
              isEditing={editingSection === "primary-addresses"}
              canEdit={permissionState.canUpdate}
              onEdit={openPrimaryAddressEditor}
              onCancel={cancelEditing}
              onSave={() => void savePrimaryAddressSection()}
              isSaving={isSaving}
            >
              {editingSection === "primary-addresses" ? (
                <>
                  <AixiaActionStack>
                    <AixiaButton
                      type="button"
                      variant="secondary"
                      onClick={addAddressDraftRow}
                      disabled={isSaving}
                    >
                      <Plus className="h-4 w-4" />
                      Add Address
                    </AixiaButton>
                  </AixiaActionStack>

                  <div className="aixia-form-row-list">
                    {addressDraft.map((row, index) => (
                      <AixiaFormRowCard
                        key={row.id}
                        title={`Address ${index + 1}`}
                        description={index === 0 ? "Primary address row." : undefined}
                        onRemove={() => removeAddressDraftRow(row.id)}
                        removeDisabled={isSaving || addressDraft.length === 1}
                      >
                        <AixiaFormGrid columns="two">
                          <AixiaFormField>
                            <AixiaFieldLabel label="Country" />
                            <AixiaInputField
                              value={row.country}
                              disabled={isSaving}
                              onChange={(event) =>
                                updateAddressDraftRow(
                                  row.id,
                                  "country",
                                  event.target.value
                                )
                              }
                              placeholder="Country"
                            />
                          </AixiaFormField>

                          <AixiaFormField>
                            <AixiaFieldLabel label="City" />
                            <AixiaInputField
                              value={row.city}
                              disabled={isSaving}
                              onChange={(event) =>
                                updateAddressDraftRow(
                                  row.id,
                                  "city",
                                  event.target.value
                                )
                              }
                              placeholder="City"
                            />
                          </AixiaFormField>

                          <AixiaFormField>
                            <AixiaFieldLabel label="State / Province" />
                            <AixiaInputField
                              value={row.state_province}
                              disabled={isSaving}
                              onChange={(event) =>
                                updateAddressDraftRow(
                                  row.id,
                                  "state_province",
                                  event.target.value
                                )
                              }
                              placeholder="State / Province"
                            />
                          </AixiaFormField>

                          <AixiaFormField>
                            <AixiaFieldLabel label="ZIP / Postal Code" />
                            <AixiaInputField
                              value={row.postal_code}
                              disabled={isSaving}
                              onChange={(event) =>
                                updateAddressDraftRow(
                                  row.id,
                                  "postal_code",
                                  event.target.value
                                )
                              }
                              placeholder="Postal code"
                            />
                          </AixiaFormField>

                          <AixiaFormFullWidth>
                            <AixiaFieldLabel label="Address Line 1" />
                            <AixiaInputField
                              value={row.address_line_1}
                              disabled={isSaving}
                              onChange={(event) =>
                                updateAddressDraftRow(
                                  row.id,
                                  "address_line_1",
                                  event.target.value
                                )
                              }
                              placeholder="Address line 1"
                            />
                          </AixiaFormFullWidth>

                          <AixiaFormFullWidth>
                            <AixiaFieldLabel label="Address Line 2" />
                            <AixiaInputField
                              value={row.address_line_2}
                              disabled={isSaving}
                              onChange={(event) =>
                                updateAddressDraftRow(
                                  row.id,
                                  "address_line_2",
                                  event.target.value
                                )
                              }
                              placeholder="Address line 2"
                            />
                          </AixiaFormFullWidth>
                        </AixiaFormGrid>
                      </AixiaFormRowCard>
                    ))}
                  </div>
                </>
              ) : addresses.length === 0 ? (
                <AixiaEmptyState
                  icon={MapPin}
                  title="No primary addresses added yet"
                  description="Primary legal and billing addresses will appear here after they are added."
                />
              ) : (
                <div className="aixia-form-row-list">
                  {addresses.map((row, index) => (
                    <AixiaFormRowCard
                      key={row.id}
                      title={`Address ${index + 1}`}
                      description={row.is_primary ? "Primary address row." : undefined}
                    >
                      <AixiaFormGrid columns="two">
                        <AixiaDisplayBlock label="Country" value={row.country || "—"} />
                        <AixiaDisplayBlock label="City" value={row.city || "—"} />
                        <AixiaDisplayBlock
                          label="State / Province"
                          value={row.state_province || "—"}
                        />
                        <AixiaDisplayBlock
                          label="ZIP / Postal Code"
                          value={row.postal_code || "—"}
                        />
                        <AixiaDisplayBlock
                          label="Address Line 1"
                          value={row.address_line_1 || "—"}
                        />
                        <AixiaDisplayBlock
                          label="Address Line 2"
                          value={row.address_line_2 || "—"}
                        />
                      </AixiaFormGrid>
                    </AixiaFormRowCard>
                  ))}
                </div>
              )}
            </AixiaDetailSection>

            <AixiaDetailSection
              title="Shipping Addresses"
              description="Shipping destinations for this client."
              icon={Truck}
              isEditing={editingSection === "shipping-addresses"}
              canEdit={permissionState.canUpdate}
              onEdit={openShippingAddressEditor}
              onCancel={cancelEditing}
              onSave={() => void saveShippingAddressSection()}
              isSaving={isSaving}
            >
              {editingSection === "shipping-addresses" ? (
                <>
                  <AixiaActionStack>
                    <AixiaButton
                      type="button"
                      variant="secondary"
                      onClick={addShippingDraftRow}
                      disabled={isSaving}
                    >
                      <Plus className="h-4 w-4" />
                      Add Shipping
                    </AixiaButton>
                  </AixiaActionStack>

                  <div className="aixia-form-row-list">
                    {shippingDraft.map((row, index) => (
                      <AixiaFormRowCard
                        key={row.id}
                        title={`Shipping ${index + 1}`}
                        description={isSamePrimarySummary(row)}
                        onRemove={() => removeShippingDraftRow(row.id)}
                        removeDisabled={isSaving || shippingDraft.length === 1}
                      >
                        <AixiaFormGrid columns="two">
                          <AixiaFormFullWidth>
                            <AixiaCheckboxField
                              checked={row.same_as_primary}
                              disabled={isSaving}
                              onChange={(event) =>
                                updateShippingDraftRow(
                                  row.id,
                                  "same_as_primary",
                                  event.target.checked
                                )
                              }
                              label="Same as primary address"
                              description="Select one primary address and copy its values into this shipping row."
                            />
                          </AixiaFormFullWidth>

                          {row.same_as_primary ? (
                            <AixiaFormFullWidth>
                              <AixiaFieldLabel label="Source Primary Address" />
                              <AixiaSelectField
                                value={row.source_address_id}
                                disabled={isSaving}
                                onChange={(event) =>
                                  updateShippingDraftRow(
                                    row.id,
                                    "source_address_id",
                                    event.target.value
                                  )
                                }
                              >
                                <option value="" className="bg-[#05070d]">
                                  Select address
                                </option>
                                {primaryAddressOptions.map((option) => (
                                  <option
                                    key={option.id}
                                    value={option.id}
                                    className="bg-[#05070d]"
                                  >
                                    {option.label}
                                  </option>
                                ))}
                              </AixiaSelectField>
                            </AixiaFormFullWidth>
                          ) : (
                            <>
                              <AixiaFormField>
                                <AixiaFieldLabel label="Country" />
                                <AixiaInputField
                                  value={row.country}
                                  disabled={isSaving}
                                  onChange={(event) =>
                                    updateShippingDraftRow(
                                      row.id,
                                      "country",
                                      event.target.value
                                    )
                                  }
                                  placeholder="Country"
                                />
                              </AixiaFormField>

                              <AixiaFormField>
                                <AixiaFieldLabel label="City" />
                                <AixiaInputField
                                  value={row.city}
                                  disabled={isSaving}
                                  onChange={(event) =>
                                    updateShippingDraftRow(
                                      row.id,
                                      "city",
                                      event.target.value
                                    )
                                  }
                                  placeholder="City"
                                />
                              </AixiaFormField>

                              <AixiaFormField>
                                <AixiaFieldLabel label="State / Province" />
                                <AixiaInputField
                                  value={row.state_province}
                                  disabled={isSaving}
                                  onChange={(event) =>
                                    updateShippingDraftRow(
                                      row.id,
                                      "state_province",
                                      event.target.value
                                    )
                                  }
                                  placeholder="State / Province"
                                />
                              </AixiaFormField>

                              <AixiaFormField>
                                <AixiaFieldLabel label="ZIP / Postal Code" />
                                <AixiaInputField
                                  value={row.postal_code}
                                  disabled={isSaving}
                                  onChange={(event) =>
                                    updateShippingDraftRow(
                                      row.id,
                                      "postal_code",
                                      event.target.value
                                    )
                                  }
                                  placeholder="Postal code"
                                />
                              </AixiaFormField>

                              <AixiaFormFullWidth>
                                <AixiaFieldLabel label="Address Line 1" />
                                <AixiaInputField
                                  value={row.address_line_1}
                                  disabled={isSaving}
                                  onChange={(event) =>
                                    updateShippingDraftRow(
                                      row.id,
                                      "address_line_1",
                                      event.target.value
                                    )
                                  }
                                  placeholder="Address line 1"
                                />
                              </AixiaFormFullWidth>

                              <AixiaFormFullWidth>
                                <AixiaFieldLabel label="Address Line 2" />
                                <AixiaInputField
                                  value={row.address_line_2}
                                  disabled={isSaving}
                                  onChange={(event) =>
                                    updateShippingDraftRow(
                                      row.id,
                                      "address_line_2",
                                      event.target.value
                                    )
                                  }
                                  placeholder="Address line 2"
                                />
                              </AixiaFormFullWidth>
                            </>
                          )}
                        </AixiaFormGrid>
                      </AixiaFormRowCard>
                    ))}
                  </div>
                </>
              ) : shippingAddresses.length === 0 ? (
                <AixiaEmptyState
                  icon={Truck}
                  title="No shipping addresses added yet"
                  description="Shipping destination records will appear here after they are added."
                />
              ) : (
                <div className="aixia-form-row-list">
                  {shippingAddresses.map((row, index) => (
                    <AixiaFormRowCard
                      key={row.id}
                      title={`Shipping ${index + 1}`}
                      description={
                        row.is_same_as_primary
                          ? "Same as primary address."
                          : "Standalone shipping address."
                      }
                    >
                      {row.is_same_as_primary ? (
                        <AixiaAlert tone="info">
                          <AixiaAlertText
                            title="Same as primary address"
                            description="This shipping row is linked to the primary address."
                          />
                        </AixiaAlert>
                      ) : (
                        <AixiaFormGrid columns="two">
                          <AixiaDisplayBlock label="Country" value={row.country || "—"} />
                          <AixiaDisplayBlock label="City" value={row.city || "—"} />
                          <AixiaDisplayBlock
                            label="State / Province"
                            value={row.state_province || "—"}
                          />
                          <AixiaDisplayBlock
                            label="ZIP / Postal Code"
                            value={row.postal_code || "—"}
                          />
                          <AixiaDisplayBlock
                            label="Address Line 1"
                            value={row.address_line_1 || "—"}
                          />
                          <AixiaDisplayBlock
                            label="Address Line 2"
                            value={row.address_line_2 || "—"}
                          />
                        </AixiaFormGrid>
                      )}
                    </AixiaFormRowCard>
                  ))}
                </div>
              )}
            </AixiaDetailSection>

            <AixiaDetailSection
              title="Notes"
              description="Internal finance notes for this client."
              icon={FileText}
              isEditing={editingSection === "notes"}
              canEdit={permissionState.canUpdate}
              onEdit={openNotesEditor}
              onCancel={cancelEditing}
              onSave={() => void saveNotesSection()}
              isSaving={isSaving}
            >
              {editingSection === "notes" ? (
                <AixiaFormField>
                  <AixiaFieldLabel label="Notes" />
                  <AixiaTextareaField
                    value={notesDraft}
                    disabled={isSaving}
                    onChange={(event) => setNotesDraft(event.target.value)}
                    placeholder="Internal notes..."
                  />
                </AixiaFormField>
              ) : (
                <AixiaDisplayBlock
                  label="Notes"
                  value={client.notes || "No notes added yet."}
                />
              )}
            </AixiaDetailSection>
          </>
        }
        side={
          <>
            <AixiaSection
              title="Record Summary"
              description="Key client details and current lifecycle."
              icon={Sparkles}
            >
              <AixiaReviewGrid>
                {summaryItems.map((item) => (
                  <AixiaReviewBlock
                    key={item.label}
                    label={item.label}
                    value={item.value}
                    description={item.description}
                  />
                ))}
              </AixiaReviewGrid>
            </AixiaSection>

            <AixiaSection
              title="Lifecycle Actions"
              description="Archive or restore this client. Permanent delete is only available from the registry archive modal."
              icon={Archive}
            >
              <AixiaActionStack>
                {permissionState.canDeleteArchive ? (
                  <AixiaButton
                    type="button"
                    variant={client.status === "archived" ? "secondary" : "danger"}
                    onClick={() => void handleArchiveToggle()}
                    disabled={isLifecycleRunning}
                  >
                    {isLifecycleRunning ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : client.status === "archived" ? (
                      <RotateCcw className="h-4 w-4" />
                    ) : (
                      <Archive className="h-4 w-4" />
                    )}
                    {client.status === "archived" ? "Restore Client" : "Archive Client"}
                  </AixiaButton>
                ) : (
                  <AixiaAlert tone="info">
                    <AixiaAlertText
                      title="Lifecycle access locked"
                      description="Delete/Archive access is not enabled for this user."
                    />
                  </AixiaAlert>
                )}

                <AixiaButton
                  type="button"
                  variant="secondary"
                  onClick={() => navigate("/finance/master-data/clients")}
                >
                  <ArrowRight className="h-4 w-4 rotate-180" />
                  Clients
                </AixiaButton>
              </AixiaActionStack>
            </AixiaSection>

            <AixiaSection
              title="System Fields"
              description="Read-only audit and system metadata."
              icon={Landmark}
            >
              <AixiaReviewGrid>
                <AixiaReviewBlock label="Client Code" value={client.code || "—"} />
                <AixiaReviewBlock label="Record ID" value={client.id} />
                <AixiaReviewBlock
                  label="Created"
                  value={formatDateTimeLabel(client.created_at)}
                />
                <AixiaReviewBlock
                  label="Updated"
                  value={formatDateTimeLabel(client.updated_at)}
                />
                <AixiaReviewBlock
                  label="Primary Address"
                  value={getPrimaryAddressSummary(addresses)}
                />
                <AixiaReviewBlock
                  label="Shipping"
                  value={getShippingSummary(shippingAddresses)}
                />
              </AixiaReviewGrid>
            </AixiaSection>

            <AixiaAlert tone="info">
              <AixiaAlertText
                title="Locked detail rule"
                description="This page requires Client Read access. Section edits require Update access. Archive and Restore require Delete/Archive access. Refresh is silent in the background and must not jump the page or reset the UI."
              />
            </AixiaAlert>
          </>
        }
      />
      </div></FinancePage>
  );
}
