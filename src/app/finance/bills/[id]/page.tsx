"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useNavigate, useParams } from "react-router-dom";
import {
  getEffectivePermissions,
  type Permission,
  type Role,
} from "@/lib/permissions";

type BillRecord = {
  id: string;
  bill_number: string;
  vendor_id: string;
  status: string;
  total_amount: number;
  balance_due: number;
  paid_amount: number;
};

type BillLineItem = {
  id: string;
  description: string;
  line_total: number;
};

type ProfilePermissionRow = {
  role: Role;
  permissions?: Partial<Record<Permission, boolean>> | null;
};

type FunctionResponse<T> = {
  success?: boolean;
  error?: string;
  bill?: T;
  lineItem?: unknown;
  payment?: unknown;
};

export default function BillDetailPage() {
  const params = useParams();
  const navigate = useNavigate();
  const id = params.id as string;

  const [bill, setBill] = useState<BillRecord | null>(null);
  const [items, setItems] = useState<BillLineItem[]>([]);
  const [isWorking, setIsWorking] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [role, setRole] = useState<Role | null>(null);
  const [permissionOverrides, setPermissionOverrides] = useState<
    Partial<Record<Permission, boolean>> | null
  >(null);

  async function loadPermissions() {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user?.id) {
      setRole(null);
      setPermissionOverrides(null);
      return;
    }

    const { data } = await supabase
      .from("profiles")
      .select("role, permissions")
      .eq("user_id", user.id)
      .maybeSingle();

    if (data) {
      const typed = data as ProfilePermissionRow;
      setRole(typed.role);
      setPermissionOverrides(typed.permissions || null);
    } else {
      setRole(null);
      setPermissionOverrides(null);
    }
  }

  async function load() {
    const { data: billData, error: billError } = await supabase
      .from("finance_bills_received")
      .select("*")
      .eq("id", id)
      .single();

    if (billError) {
      throw billError;
    }

    const { data: lineItems, error: lineItemsError } = await supabase
      .from("finance_bill_line_items")
      .select("*")
      .eq("bill_id", id)
      .order("sort_order", { ascending: true });

    if (lineItemsError) {
      throw lineItemsError;
    }

    setBill((billData as BillRecord | null) ?? null);
    setItems((lineItems as BillLineItem[]) ?? []);
  }

  async function loadAll() {
    setErrorMessage("");

    try {
      await Promise.all([loadPermissions(), load()]);
    } catch (error) {
      console.error("Failed to load bill detail:", error);
      setErrorMessage(
        error instanceof Error ? error.message : "Failed to load bill"
      );
    }
  }

  const effectivePermissions = useMemo(() => {
    if (!role) return null;
    return getEffectivePermissions(role, permissionOverrides);
  }, [role, permissionOverrides]);

  const canEditDraftBills = !!effectivePermissions?.editDraftBills;
  const canOpenBills = !!effectivePermissions?.openBills;
  const canRecordPaymentsMade = !!effectivePermissions?.recordPaymentsMade;

  async function getAccessToken() {
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token ?? null;
  }

  async function addItem() {
    if (!bill) return;
    if (!canEditDraftBills) {
      setErrorMessage("You do not have permission to edit draft bills.");
      return;
    }

    setIsWorking(true);
    setErrorMessage("");

    try {
      const accessToken = await getAccessToken();

      if (!accessToken) {
        throw new Error("Missing session token.");
      }

      const { data, error } = await supabase.functions.invoke<
        FunctionResponse<BillRecord>
      >("bill-add-line-item", {
        body: {
          billId: id,
          description: "New Bill Line",
          quantity: 1,
          unitPrice: 100,
        },
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (error) {
        throw error;
      }

      if (data?.success === false) {
        throw new Error(data.error || "Failed to add bill line item.");
      }

      await load();
    } catch (error) {
      console.error("Add bill item failed:", error);
      setErrorMessage(
        error instanceof Error ? error.message : "Failed to add bill item."
      );
    } finally {
      setIsWorking(false);
    }
  }

  async function openBill() {
    if (!bill) return;
    if (!canOpenBills) {
      setErrorMessage("You do not have permission to open bills.");
      return;
    }

    setIsWorking(true);
    setErrorMessage("");

    try {
      const accessToken = await getAccessToken();

      if (!accessToken) {
        throw new Error("Missing session token.");
      }

      const { data, error } = await supabase.functions.invoke<
        FunctionResponse<BillRecord>
      >("bill-open", {
        body: {
          billId: id,
        },
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (error) {
        throw error;
      }

      if (data?.success === false) {
        throw new Error(data.error || "Failed to open bill.");
      }

      await load();
    } catch (error) {
      console.error("Open bill failed:", error);
      setErrorMessage(
        error instanceof Error ? error.message : "Failed to open bill."
      );
    } finally {
      setIsWorking(false);
    }
  }

  async function pay() {
    if (!bill) return;
    if (!canRecordPaymentsMade) {
      setErrorMessage("You do not have permission to record payments made.");
      return;
    }

    setIsWorking(true);
    setErrorMessage("");

    try {
      const accessToken = await getAccessToken();

      if (!accessToken) {
        throw new Error("Missing session token.");
      }

      const { data, error } = await supabase.functions.invoke<
        FunctionResponse<BillRecord>
      >("payment-made", {
        body: {
          amount: 100,
          paymentDate: new Date().toISOString().slice(0, 10),
          vendorId: bill.vendor_id,
          billId: id,
        },
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (error) {
        throw error;
      }

      if (data?.success === false) {
        throw new Error(data.error || "Failed to record payment.");
      }

      await load();
    } catch (error) {
      console.error("Record payment failed:", error);
      setErrorMessage(
        error instanceof Error ? error.message : "Failed to record payment."
      );
    } finally {
      setIsWorking(false);
    }
  }

  useEffect(() => {
    let channel: ReturnType<typeof supabase.channel> | null = null;

    async function setup() {
      await loadAll();

      channel = supabase
        .channel(`bill-${id}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "finance_bills_received",
            filter: `id=eq.${id}`,
          },
          () => {
            void load();
          }
        )
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "finance_bill_line_items",
            filter: `bill_id=eq.${id}`,
          },
          () => {
            void load();
          }
        )
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "finance_payments_made",
            filter: `bill_id=eq.${id}`,
          },
          () => {
            void load();
          }
        )
        .subscribe();
    }

    void setup();

    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [id]);

  if (!bill) {
    return (
      <div className="h-full flex flex-col gap-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-white">Bill</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Loading bill details.
            </p>
          </div>

          <button
            type="button"
            onClick={() => navigate("/finance/bills")}
            className="px-4 py-2 rounded-lg border border-border text-sm text-white"
          >
            Back to Bills
          </button>
        </div>

        {errorMessage ? (
          <div className="border border-red-800/40 bg-red-900/20 rounded-xl p-4 text-sm text-red-300">
            {errorMessage}
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col gap-6 p-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-white">
            {bill.bill_number}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage bill lines, status, and outgoing payments.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate("/finance/bills")}
            className="px-4 py-2 rounded-lg border border-border text-sm text-white"
          >
            Back to Bills
          </button>

          <button
            type="button"
            onClick={addItem}
            disabled={isWorking || !canEditDraftBills}
            className="px-4 py-2 rounded-lg border border-border text-sm text-white disabled:opacity-60"
          >
            Add Item
          </button>

          <button
            type="button"
            onClick={openBill}
            disabled={isWorking || bill.status !== "draft" || !canOpenBills}
            className="px-4 py-2 rounded-lg border border-border text-sm text-white disabled:opacity-60"
          >
            Open Bill
          </button>

          <button
            type="button"
            onClick={pay}
            disabled={isWorking || !canRecordPaymentsMade}
            className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium disabled:opacity-60"
          >
            Pay 100
          </button>
        </div>
      </div>

      {errorMessage ? (
        <div className="border border-red-800/40 bg-red-900/20 rounded-xl p-4 text-sm text-red-300">
          {errorMessage}
        </div>
      ) : null}

      <div className="grid grid-cols-4 gap-4">
        <div className="border border-border rounded-xl bg-background/40 p-4">
          <div className="text-sm text-muted-foreground">Status</div>
          <div className="text-white mt-2">{bill.status}</div>
        </div>

        <div className="border border-border rounded-xl bg-background/40 p-4">
          <div className="text-sm text-muted-foreground">Total</div>
          <div className="text-white mt-2">{bill.total_amount}</div>
        </div>

        <div className="border border-border rounded-xl bg-background/40 p-4">
          <div className="text-sm text-muted-foreground">Paid</div>
          <div className="text-white mt-2">{bill.paid_amount}</div>
        </div>

        <div className="border border-border rounded-xl bg-background/40 p-4">
          <div className="text-sm text-muted-foreground">Balance</div>
          <div className="text-white mt-2">{bill.balance_due}</div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto pb-4">
        <div className="border border-border rounded-xl bg-background/40 overflow-hidden">
          <div className="grid grid-cols-2 gap-4 px-5 py-4 text-sm font-medium text-muted-foreground border-b border-border">
            <div>Description</div>
            <div>Line Total</div>
          </div>

          {items.length === 0 ? (
            <div className="px-5 py-6 text-sm text-muted-foreground">
              No line items found.
            </div>
          ) : (
            items.map((item) => (
              <div
                key={item.id}
                className="grid grid-cols-2 gap-4 px-5 py-4 border-b border-border last:border-b-0"
              >
                <div className="text-white">{item.description}</div>
                <div className="text-white">{item.line_total}</div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
