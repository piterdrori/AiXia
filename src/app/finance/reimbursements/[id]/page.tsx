import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";
import {
  getEffectivePermissions,
  type Permission,
  type Role,
} from "@/lib/permissions";

type ReimbursementRecord = {
  id: string;
  reimbursement_number: string;
  expense_id: string;
  employee_user_id: string;
  amount: number | string;
  status: string;
  payment_date: string | null;
  reference_number: string | null;
  payment_method_id: string | null;
  bank_account_id: string | null;
};

type ProfilePermissionRow = {
  role: Role;
  permissions?: Partial<Record<Permission, boolean>> | null;
};

type FunctionResponse = {
  success?: boolean;
  error?: string;
  reimbursementId?: string;
};

export default function FinanceReimbursementDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [record, setRecord] = useState<ReimbursementRecord | null>(null);
  const [role, setRole] = useState<Role | null>(null);
  const [permissionOverrides, setPermissionOverrides] = useState<
    Partial<Record<Permission, boolean>> | null
  >(null);
  const [referenceNumber, setReferenceNumber] = useState("");
  const [isWorking, setIsWorking] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    void loadAll();
  }, [id]);

  async function loadAll() {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user?.id) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("role, permissions")
          .eq("user_id", user.id)
          .maybeSingle();

        if (profile) {
          const typed = profile as ProfilePermissionRow;
          setRole(typed.role);
          setPermissionOverrides(typed.permissions || null);
        }
      }

      const { data, error } = await supabase
        .from("finance_reimbursements")
        .select("*")
        .eq("id", id)
        .single();

      if (error) throw error;

      const typed = (data as ReimbursementRecord | null) ?? null;
      setRecord(typed);
      setReferenceNumber(typed?.reference_number || "");
    } catch (error) {
      console.error("Failed to load reimbursement:", error);
      setErrorMessage(
        error instanceof Error ? error.message : "Failed to load reimbursement."
      );
    }
  }

  const permissions = useMemo(() => {
    if (!role) return null;
    return getEffectivePermissions(role, permissionOverrides);
  }, [role, permissionOverrides]);

  const canRecordReimbursementPayments =
    !!permissions?.recordReimbursementPayments;

  async function markPaid() {
    if (!record) return;

    setIsWorking(true);
    setErrorMessage("");

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData.session?.access_token;

      if (!accessToken) {
        throw new Error("Missing session token.");
      }

      const { data, error } = await supabase.functions.invoke<FunctionResponse>(
        "reimbursement-pay",
        {
          body: {
            reimbursementId: record.id,
            referenceNumber: referenceNumber || null,
            paymentDate: new Date().toISOString().slice(0, 10),
          },
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      if (error) throw error;
      if (data?.success === false) {
        throw new Error(data.error || "Failed to record reimbursement payment.");
      }

      await loadAll();
    } catch (error) {
      console.error("Mark reimbursement paid failed:", error);
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Failed to record reimbursement payment."
      );
    } finally {
      setIsWorking(false);
    }
  }

  useEffect(() => {
    let channel: ReturnType<typeof supabase.channel> | null = null;

    channel = supabase
      .channel(`finance-reimbursement-${id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "finance_reimbursements", filter: `id=eq.${id}` },
        () => {
          void loadAll();
        }
      )
      .subscribe();

    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [id]);

  if (!record) {
    return (
      <div className="h-full flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold text-white">Reimbursement</h1>
          <Button
            variant="outline"
            onClick={() => navigate("/finance/reimbursements")}
            className="border-border bg-background/40 text-white hover:bg-background/60"
          >
            Back to Reimbursements
          </Button>
        </div>

        {errorMessage ? (
          <div className="text-sm text-red-400">{errorMessage}</div>
        ) : (
          <div className="text-muted-foreground">Loading reimbursement...</div>
        )}
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col gap-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-white">
            {record.reimbursement_number}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage reimbursement payout status.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            onClick={() => navigate("/finance/reimbursements")}
            className="border-border bg-background/40 text-white hover:bg-background/60"
          >
            Back to Reimbursements
          </Button>

          {record.status !== "paid" && canRecordReimbursementPayments ? (
            <Button onClick={() => void markPaid()} disabled={isWorking}>
              Mark Paid
            </Button>
          ) : null}
        </div>
      </div>

      {errorMessage ? (
        <div className="text-sm text-red-400">{errorMessage}</div>
      ) : null}

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="border border-border rounded-xl p-4 bg-background/40">
          <div className="text-sm text-muted-foreground">Amount</div>
          <div className="text-white mt-2">{record.amount}</div>
        </div>

        <div className="border border-border rounded-xl p-4 bg-background/40">
          <div className="text-sm text-muted-foreground">Status</div>
          <div className="text-white mt-2">{record.status}</div>
        </div>

        <div className="border border-border rounded-xl p-4 bg-background/40">
          <div className="text-sm text-muted-foreground">Payment Date</div>
          <div className="text-white mt-2">{record.payment_date || "—"}</div>
        </div>

        <div className="border border-border rounded-xl p-4 bg-background/40">
          <div className="text-sm text-muted-foreground">Expense</div>
          <div className="text-white mt-2">{record.expense_id}</div>
        </div>
      </div>

      <div className="border border-border rounded-xl p-4 bg-background/40 flex flex-col gap-3">
        <div className="text-white font-medium">Payment Reference</div>

        <input
          value={referenceNumber}
          onChange={(e) => setReferenceNumber(e.target.value)}
          placeholder="Reference number"
          className="bg-background/60 border border-border rounded px-3 py-2 text-white"
        />

        <div className="text-xs text-muted-foreground">
          Employee: {record.employee_user_id}
        </div>
      </div>
    </div>
  );
}
