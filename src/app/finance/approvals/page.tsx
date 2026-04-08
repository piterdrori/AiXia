import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";

type ApprovalRow = {
  id: string;
  entity_type: string;
  entity_id: string;
  workflow_type: string | null;
  step_number: number;
  status: string;
  approver_user_id: string | null;
  requester_user_id: string | null;
  created_at: string;
};

export default function FinanceApprovalsPage() {
  const navigate = useNavigate();
  const [rows, setRows] = useState<ApprovalRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void loadRows();
  }, []);

  async function loadRows() {
    try {
      const { data, error } = await supabase
        .from("finance_approval_records")
        .select(
          "id, entity_type, entity_id, workflow_type, step_number, status, approver_user_id, requester_user_id, created_at"
        )
        .order("created_at", { ascending: false });

      if (error) throw error;
      setRows((data || []) as ApprovalRow[]);
    } catch (error) {
      console.error("Failed to load approvals:", error);
      setRows([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let channel: ReturnType<typeof supabase.channel> | null = null;

    channel = supabase
      .channel("finance-approvals-list")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "finance_approval_records" },
        () => {
          void loadRows();
        }
      )
      .subscribe();

    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, []);

  function goToEntity(row: ApprovalRow) {
    if (row.entity_type === "finance_expense") {
      navigate(`/finance/expenses/${row.entity_id}`);
      return;
    }

    navigate("/finance");
  }

  return (
    <div className="h-full flex flex-col gap-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-white">
            Finance — Approvals
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Review and monitor finance approval requests.
          </p>
        </div>

        <Button
          variant="outline"
          onClick={() => navigate("/finance")}
          className="border-border bg-background/40 text-white hover:bg-background/60"
        >
          Finance Home
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto pb-4 border border-border rounded-xl p-4">
        {loading ? (
          <div className="text-muted-foreground">Loading...</div>
        ) : rows.length === 0 ? (
          <div className="text-muted-foreground">No approval records yet</div>
        ) : (
          <div className="flex flex-col gap-3">
            {rows.map((row) => (
              <button
                key={row.id}
                type="button"
                onClick={() => goToEntity(row)}
                className="w-full text-left border border-border rounded-lg p-4 bg-background/40 hover:bg-background/60 transition-colors"
              >
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                  <div className="text-white font-medium">
                    {row.entity_type} • {row.workflow_type || "workflow"}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Step {row.step_number}
                  </div>
                </div>

                <div className="mt-2 text-xs text-muted-foreground">
                  Status: {row.status} • Approver: {row.approver_user_id || "—"} •
                  Requester: {row.requester_user_id || "—"}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
